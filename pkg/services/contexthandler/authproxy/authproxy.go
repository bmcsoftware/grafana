package authproxy

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"hash/fnv"
	"net"
	"path"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.bmc.com/DSOM-ADE/authz-go"
	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/infra/remotecache"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/ldap"
	"github.com/grafana/grafana/pkg/services/login"
	"github.com/grafana/grafana/pkg/services/multildap"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"
)

const (

	// CachePrefix is a prefix for the cache key
	CachePrefix = "auth-proxy-sync-ttl:%s"
	//author(ateli) - start
	//role constants to check valid permissions for logged in user
	reportingViewer = "reporting.dashboards_permissions.viewer"
	reportingEditor = "reporting.dashboards_permissions.editor"
	reportingAdmin  = "reporting.dashboards_permissions.admin"
	//author(ateli) - end
)

// getLDAPConfig gets LDAP config
var getLDAPConfig = ldap.GetConfig

// isLDAPEnabled checks if LDAP is enabled
var isLDAPEnabled = func(cfg *setting.Cfg) bool {
	if cfg != nil {
		return cfg.LDAPEnabled
	}

	return setting.LDAPEnabled
}

// newLDAP creates multiple LDAP instance
var newLDAP = multildap.New

// supportedHeaders states the supported headers configuration fields
var supportedHeaderFields = []string{"Name", "Email", "Login", "Groups", "Role"}

// AuthProxy struct
type AuthProxy struct {
	cfg          *setting.Cfg
	remoteCache  *remotecache.RemoteCache
	loginService login.Service
	sqlStore     db.DB
	userService  user.Service
	orgService   org.Service
	logger       log.Logger
}

func ProvideAuthProxy(cfg *setting.Cfg, remoteCache *remotecache.RemoteCache, loginService login.Service, userService user.Service, orgService org.Service, sqlStore db.DB) *AuthProxy {
	return &AuthProxy{
		cfg:          cfg,
		remoteCache:  remoteCache,
		loginService: loginService,
		sqlStore:     sqlStore,
		userService:  userService,
		orgService:   orgService,
		logger:       log.New("auth.proxy"),
	}
}

// Error auth proxy specific error
type Error struct {
	Message      string
	DetailsError error
}

// newError returns an Error.
func newError(message string, err error) Error {
	return Error{
		Message:      message,
		DetailsError: err,
	}
}

// Error returns the error message.
func (err Error) Error() string {
	return err.Message
}

// IsEnabled checks if the auth proxy is enabled.
func (auth *AuthProxy) IsEnabled() bool {
	// Bail if the setting is not enabled
	return auth.cfg.AuthProxyEnabled
}

// HasHeader checks if we have specified header
func (auth *AuthProxy) HasHeader(reqCtx *models.ReqContext) bool {
	header := auth.getDecodedHeader(reqCtx, auth.cfg.AuthProxyHeaderName)
	return len(header) != 0
}

// IsAllowedIP returns whether provided IP is allowed.
func (auth *AuthProxy) IsAllowedIP(ip string) error {
	if len(strings.TrimSpace(auth.cfg.AuthProxyWhitelist)) == 0 {
		return nil
	}

	proxies := strings.Split(auth.cfg.AuthProxyWhitelist, ",")
	var proxyObjs []*net.IPNet
	for _, proxy := range proxies {
		result, err := coerceProxyAddress(proxy)
		if err != nil {
			return newError("could not get the network", err)
		}

		proxyObjs = append(proxyObjs, result)
	}

	sourceIP, _, err := net.SplitHostPort(ip)
	if err != nil {
		return newError("could not parse address", err)
	}
	sourceObj := net.ParseIP(sourceIP)

	for _, proxyObj := range proxyObjs {
		if proxyObj.Contains(sourceObj) {
			return nil
		}
	}

	return newError("proxy authentication required", fmt.Errorf(
		"request for user from %s is not from the authentication proxy",
		sourceIP,
	))
}

func HashCacheKey(key string) (string, error) {
	hasher := fnv.New128a()
	if _, err := hasher.Write([]byte(key)); err != nil {
		return "", err
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}

// getKey forms a key for the cache based on the headers received as part of the authentication flow.
// Our configuration supports multiple headers. The main header contains the email or username.
// And the additional ones that allow us to specify extra attributes: Name, Email, Role, or Groups.
func (auth *AuthProxy) getKey(reqCtx *models.ReqContext) (string, error) {
	header := auth.getDecodedHeader(reqCtx, auth.cfg.AuthProxyHeaderName)
	key := strings.TrimSpace(header) // start the key with the main header

	auth.headersIterator(reqCtx, func(_, header string) {
		key = strings.Join([]string{key, header}, "-") // compose the key with any additional headers
	})

	hashedKey, err := HashCacheKey(key)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(CachePrefix, hashedKey), nil
}

// Login logs in user ID by whatever means possible.
func (auth *AuthProxy) Login(reqCtx *models.ReqContext, ignoreCache bool) (int64, error) {
	if !ignoreCache {
		// Error here means absent cache - we don't need to handle that
		id, err := auth.getUserViaCache(reqCtx)
		if err == nil && id != 0 {
			return id, nil
		}
	}

	if isLDAPEnabled(auth.cfg) {
		id, err := auth.LoginViaLDAP(reqCtx)
		if err != nil {
			if errors.Is(err, ldap.ErrInvalidCredentials) {
				return 0, newError("proxy authentication required", ldap.ErrInvalidCredentials)
			}
			return 0, newError("failed to get the user", err)
		}

		return id, nil
	}

	id, err := auth.loginViaHeader(reqCtx)
	if err != nil {
		return 0, newError("failed to log in as user, specified in auth proxy header", err)
	}

	return id, nil
}

// getUserViaCache gets user ID from cache.
func (auth *AuthProxy) getUserViaCache(reqCtx *models.ReqContext) (int64, error) {
	cacheKey, err := auth.getKey(reqCtx)
	if err != nil {
		return 0, err
	}
	auth.logger.Debug("Getting user ID via auth cache", "cacheKey", cacheKey)
	userID, err := auth.remoteCache.Get(reqCtx.Req.Context(), cacheKey)
	if err != nil {
		auth.logger.Debug("Failed getting user ID via auth cache", "error", err)
		return 0, err
	}

	auth.logger.Debug("Successfully got user ID via auth cache", "id", userID)
	return userID.(int64), nil
}

// RemoveUserFromCache removes user from cache.
func (auth *AuthProxy) RemoveUserFromCache(reqCtx *models.ReqContext) error {
	cacheKey, err := auth.getKey(reqCtx)
	if err != nil {
		return err
	}
	auth.logger.Debug("Removing user from auth cache", "cacheKey", cacheKey)
	if err := auth.remoteCache.Delete(reqCtx.Req.Context(), cacheKey); err != nil {
		return err
	}

	auth.logger.Debug("Successfully removed user from auth cache", "cacheKey", cacheKey)
	return nil
}

// LoginViaLDAP logs in user via LDAP request
func (auth *AuthProxy) LoginViaLDAP(reqCtx *models.ReqContext) (int64, error) {
	config, err := getLDAPConfig(auth.cfg)
	if err != nil {
		return 0, newError("failed to get LDAP config", err)
	}

	header := auth.getDecodedHeader(reqCtx, auth.cfg.AuthProxyHeaderName)
	mldap := newLDAP(config.Servers)
	extUser, _, err := mldap.User(header)
	if err != nil {
		return 0, err
	}

	// Have to sync grafana and LDAP user during log in
	upsert := &models.UpsertUserCommand{
		ReqContext:    reqCtx,
		SignupAllowed: auth.cfg.LDAPAllowSignup,
		ExternalUser:  extUser,
		UserLookupParams: models.UserLookupParams{
			Login:  &extUser.Login,
			Email:  &extUser.Email,
			UserID: nil,
		},
	}
	if err := auth.loginService.UpsertUser(reqCtx.Req.Context(), upsert); err != nil {
		return 0, err
	}

	return upsert.Result.ID, nil
}

// loginViaHeader logs in user from the header only
var debugLogger = log.New("BMC.LOGGER")

func (auth *AuthProxy) loginViaHeader(reqCtx *models.ReqContext) (int64, error) {
	debugLogger.Info("loginViaHeader")
	header := auth.getDecodedHeader(reqCtx, auth.cfg.AuthProxyHeaderName)
	//author (ateli) - start
	RSSOUser := reqCtx.Context.Req.Header.Get("X-Webauth-User")
	RSSOTenant := reqCtx.Context.Req.Header.Get("X-Rsso-Tenant")
	header = RSSOUser

	debugLogger.Info("loginViaHeader", "RSSOUser", RSSOUser, "RSSOTenant", RSSOTenant)

	if RSSOTenant != "" && RSSOTenant != "dashboards_superuser_tenant" {
		header = RSSOUser + "@" + RSSOTenant
	}

	debugLogger.Info("loginViaHeader", "RSSOUser", RSSOUser, "RSSOTenant", RSSOTenant, "header", header)

	encodedJwt := reqCtx.Context.Req.Header.Get("X-Jwt-Token")
	var decodedJwt *authz.UserInfo
	var userId int64

	if encodedJwt != "" {
		debugLogger.Info("loginViaHeader - There is jwt token ", "length", len(encodedJwt))
		usrObj, err := authz.Authorize(encodedJwt)
		if usrObj != nil {
			orgID, _ := strconv.ParseInt(usrObj.Tenant_Id, 10, 64)
			// BMC change next block: To support IMS tenant 0
			if orgID == setting.IMS_Tenant0 {
				orgID = setting.GF_Tenant0
				usrObj.Tenant_Id = fmt.Sprintf("%d", orgID)
			}
		}
		decodedJwt = usrObj
		if err != nil {
			debugLogger.Error("Failed to authorize user", "error", err)
			fmt.Errorf("500", err.Error())
		}
		if decodedJwt != nil {
			debugLogger.Info("loginViaHeader - decodedJwt", "decodedJwt", decodedJwt.UserID, "Tenant_Id", decodedJwt.Tenant_Id)
			userId, _ = strconv.ParseInt(decodedJwt.UserID, 10, 64)
		}
	}
	//author (ateli) - end
	extUser := &models.ExternalUserInfo{
		AuthModule: login.AuthProxyAuthModule,
		AuthId:     header,
	}

	//author (ateli) start
	if userId != 0 {
		extUser.UserId = userId
	}

	debugLogger.Info("loginViaHeader - after if userId", "userId", userId)
	//author (ateli) end
	switch auth.cfg.AuthProxyHeaderProperty {
	case "username":
		extUser.Login = header

		// Bmc code start - This block was corrupting the user email address
	//	emailAddr, emailErr := mail.ParseAddress(header) // only set Email if it can be parsed as an email address
	//	if emailErr == nil {
	//		extUser.Email = emailAddr.Address
	//	}
	// Bmc code end
	
	case "email":
		extUser.Email = header
		extUser.Login = header
	default:
		return 0, fmt.Errorf("auth proxy header property invalid")
	}

	auth.headersIterator(reqCtx, func(field string, header string) {
		debugLogger.Info("loginViaHeader - headersIterator", "field", field, "header", header)
		switch field {
		case "Groups":
			extUser.Groups = util.SplitString(header)
		case "Role":
			// If Role header is specified, we update the user role of the default org
			if header != "" {
				rt := org.RoleType(header)
				if rt.IsValid() {
					extUser.OrgRoles = map[int64]org.RoleType{}
					orgID := int64(1)
					if setting.AutoAssignOrg && setting.AutoAssignOrgId > 0 {
						orgID = int64(setting.AutoAssignOrgId)
					}
					extUser.OrgRoles[orgID] = rt
				}
			}
		default:
			reflect.ValueOf(extUser).Elem().FieldByName(field).SetString(header)
		}
	})

	debugLogger.Info("loginViaHeader - before upsert", "Email", extUser.Email, "Login", extUser.Login, "AuthId", extUser.AuthId)
	upsert := &models.UpsertUserCommand{
		ReqContext:    reqCtx,
		SignupAllowed: auth.cfg.AuthProxyAutoSignUp,
		ExternalUser:  extUser,
		UserLookupParams: models.UserLookupParams{
			UserID: &extUser.UserId,
			Login:  &extUser.Login,
			Email:  nil,
		},
	}

	err := auth.loginService.UpsertUser(reqCtx.Req.Context(), upsert)
	if err != nil {
		return 0, err
	}
	debugLogger.Info("loginViaHeader - before upsert", "UserID", upsert.Result.ID, "Login", upsert.Result.Login, "AuthId", upsert.Result.OrgID)
	//author(ateli) - start
	//Changes for auth proxy auto sign-up feature, Assign user to correct ADE Tenant
	if encodedJwt != "" {
		removeUserFromMainOrg := &org.RemoveOrgUserCommand{
			UserID: upsert.Result.ID,
			OrgID:  1,
		}
		err1 := auth.orgService.RemoveOrgUser(reqCtx.Req.Context(), removeUserFromMainOrg)
		if err1 != nil {
			auth.logger.Error("Unable to remove user from main org", err1.Error())
		}
		debugLogger.Info("loginViaHeader - Removed user from main org", "UserID", upsert.Result.ID)
		//add use in correct ADE org
		if decodedJwt != nil {
			debugLogger.Info("loginViaHeader - Adding org USER")
			orgId, _ := strconv.ParseInt(decodedJwt.Tenant_Id, 10, 64)
			addUserInCorrectOrg := &org.AddOrgUserCommand{}
			addUserInCorrectOrg.LoginOrEmail = decodedJwt.Principal_Id + "@" + RSSOTenant
			addUserInCorrectOrg.Role = "Viewer"
			addUserInCorrectOrg.OrgID = orgId
			addUserInCorrectOrg.UserID = upsert.Result.ID
			err2 := auth.orgService.AddOrgUser(reqCtx.Req.Context(), addUserInCorrectOrg)
			if err2 != nil {
				auth.logger.Error("Unable to add user in correct org", err2.Error())
			}
			debugLogger.Info("loginViaHeader - UserOrg is done being added")
		}
	}
	//author(ateli) - end

	return upsert.Result.ID, nil
}

// getDecodedHeader gets decoded value of a header with given headerName
func (auth *AuthProxy) getDecodedHeader(reqCtx *models.ReqContext, headerName string) string {
	headerValue := reqCtx.Req.Header.Get(headerName)
	auth.logger.Debug("Header name:", "header name", headerName, "header value", headerValue)
	if auth.cfg.AuthProxyHeadersEncoded {
		headerValue = util.DecodeQuotedPrintable(headerValue)
	}

	return headerValue
}

// headersIterator iterates over all non-empty supported additional headers
func (auth *AuthProxy) headersIterator(reqCtx *models.ReqContext, fn func(field string, header string)) {
	for _, field := range supportedHeaderFields {
		h := auth.cfg.AuthProxyHeaders[field]
		if h == "" {
			continue
		}

		if value := auth.getDecodedHeader(reqCtx, h); value != "" {
			fn(field, strings.TrimSpace(value))
		}
	}
}

// GetSignedInUser gets full signed in user info.
func (auth *AuthProxy) GetSignedInUser(userID int64, orgID int64) (*user.SignedInUser, error) {
	return auth.userService.GetSignedInUser(context.Background(), &user.GetSignedInUserQuery{
		OrgID:  orgID,
		UserID: userID,
	})
}

// Remember user in cache
func (auth *AuthProxy) Remember(reqCtx *models.ReqContext, id int64) error {
	key, err := auth.getKey(reqCtx)
	if err != nil {
		return err
	}

	// Check if user already in cache
	userID, err := auth.remoteCache.Get(reqCtx.Req.Context(), key)
	if err == nil && userID != nil {
		return nil
	}

	expiration := time.Duration(auth.cfg.AuthProxySyncTTL) * time.Minute

	if err := auth.remoteCache.Set(reqCtx.Req.Context(), key, id, expiration); err != nil {
		return err
	}

	return nil
}

// coerceProxyAddress gets network of the presented CIDR notation
func coerceProxyAddress(proxyAddr string) (*net.IPNet, error) {
	proxyAddr = strings.TrimSpace(proxyAddr)
	if !strings.Contains(proxyAddr, "/") {
		proxyAddr = path.Join(proxyAddr, "32")
	}

	_, network, err := net.ParseCIDR(proxyAddr)
	if err != nil {
		return nil, fmt.Errorf("could not parse the network: %w", err)
	}
	return network, nil
}

// author(ateli) - Start
// Method to check if user has valid reporting permission assigned in IMS
func contains(s []string, searchterm string) bool {
	i := sort.SearchStrings(s, searchterm)
	return i < len(s) && strings.ToLower(s[i]) == searchterm
}

func (auth *AuthProxy) HasValidPermissions(reqCtx *models.ReqContext) error {
	userID := reqCtx.Context.Req.Header.Get("X-Webauth-User")
	encodedJwt := reqCtx.Context.Req.Header.Get("X-Jwt-Token")
	var decodedJwt *authz.UserInfo
	if encodedJwt != "" {
		usrObj, err := authz.Authorize(encodedJwt)
		decodedJwt = usrObj
		if err != nil {
			fmt.Errorf("500", err.Error())
		}
	}
	if decodedJwt != nil {
		sort.Strings(decodedJwt.Permissions)
		if contains(decodedJwt.Permissions, reportingViewer) || contains(decodedJwt.Permissions, reportingEditor) || contains(decodedJwt.Permissions, reportingAdmin) || contains(decodedJwt.Permissions, string('*')) {
			return nil
		}
	}
	if userID == auth.cfg.AdminUser {
		return nil
	}
	return newError("To get permission to the Dashboard. Please contact your admin", errors.New("To get permission to the dashboard. Please contact your admin"))
}

//author(ateli) - End
