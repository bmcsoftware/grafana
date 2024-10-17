package clients

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"hash/fnv"
	"net"
	"os"
	"path"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana/pkg/services/contexthandler"
	"github.com/grafana/grafana/pkg/services/org"

	"github.bmc.com/DSOM-ADE/authz-go"
	bmc "github.com/grafana/grafana/pkg/api/bmc"
	"github.com/grafana/grafana/pkg/infra/log"
	authidentity "github.com/grafana/grafana/pkg/services/auth/identity"
	"github.com/grafana/grafana/pkg/services/authn"
	"github.com/grafana/grafana/pkg/services/login"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/util/errutil"
)

const (
	proxyFieldName   = "Name"
	proxyFieldEmail  = "Email"
	proxyFieldLogin  = "Login"
	proxyFieldRole   = "Role"
	proxyFieldGroups = "Groups"
	proxyCachePrefix = "authn-proxy-sync-ttl"
)

var proxyFields = [...]string{proxyFieldName, proxyFieldEmail, proxyFieldLogin, proxyFieldRole, proxyFieldGroups}

var (
	errNotAcceptedIP      = errutil.Unauthorized("auth-proxy.invalid-ip")
	errEmptyProxyHeader   = errutil.Unauthorized("auth-proxy.empty-header")
	errInvalidProxyHeader = errutil.Internal("auth-proxy.invalid-proxy-header")
)

var (
	_ authn.HookClient         = new(Proxy)
	_ authn.ContextAwareClient = new(Proxy)
)

func ProvideProxy(cfg *setting.Cfg, cache proxyCache, orgService org.Service, clients ...authn.ProxyClient) (*Proxy, error) {
	list, err := parseAcceptList(cfg.AuthProxyWhitelist)
	if err != nil {
		return nil, err
	}
	return &Proxy{log.New(authn.ClientProxy), cfg, cache, clients, list, orgService}, nil
}

type proxyCache interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, expire time.Duration) error
	Delete(ctx context.Context, key string) error
}

type Proxy struct {
	log         log.Logger
	cfg         *setting.Cfg
	cache       proxyCache
	clients     []authn.ProxyClient
	acceptedIPs []*net.IPNet
	orgService  org.Service
}

func (c *Proxy) Name() string {
	return authn.ClientProxy
}

func (c *Proxy) Authenticate(ctx context.Context, r *authn.Request) (*authn.Identity, error) {
	if !c.isAllowedIP(r) {
		return nil, errNotAcceptedIP.Errorf("request ip is not in the configured accept list")
	}
	username := getProxyHeader(r, c.cfg.AuthProxyHeaderName, c.cfg.AuthProxyHeadersEncoded)

	// BMC code
	// Changes for userID as RSSOUser@RSSO Tenant - required to achieve unique userID's across tenants
	userInfo, rssoUsername, rssoTenant, err := c.getRequestUserAuthInfo(r)
	if err != nil {
		return nil, errors.New("To get permission to the dashboard. Please contact your admin")
	}

	//If we come here via authProxy, we are authenticated already and jwt token is available
	r.DecodedToken = userInfo
	if r.DecodedToken != nil {
		r.OrgID, _ = strconv.ParseInt(userInfo.Tenant_Id, 10, 64)
		if r.OrgID == setting.IMS_Tenant0 {
			userInfo.Tenant_Id = strconv.FormatInt(setting.GF_Tenant0, 10)
			r.OrgID = setting.GF_Tenant0
		}
	}

	if c.HasValidPermissions(userInfo, username) != nil {
		c.log.Error(
			"User does not have sufficient privileges to access dashboards",
			"username", r.HTTPRequest.Header.Get("X-Webauth-User"),
			"message", "missing-reporting-permission",
		)
		return nil, authn.ErrInvalidPermission
	}

	inDedicatedInst, dedicatedTenantErr := c.forwardIfRequestForDedicatedTenant(r, userInfo, username)
	if dedicatedTenantErr != nil {
		var tmpIdentity *authn.Identity
		tmpIdentity.OrgID = r.OrgID
		return tmpIdentity, authn.ErrRequestForDedicatedTenant
	}

	// BMC code: ends

	// Update username with rsso username and ignore appending tenant as suffix if it is a superuser realm tenant.
	if rssoTenant != "" && rssoTenant != "dashboards_superuser_tenant" {
		username = rssoUsername + "@" + rssoTenant
	} else {
		username = rssoUsername
	}

	// Forward the username to request header for further use
	r.HTTPRequest.Header.Set("X-HELIX-AUTH", username)
	// BMC code

	if len(username) == 0 {
		return nil, errEmptyProxyHeader.Errorf("no username provided in auth proxy header")
	}

	additional := getAdditionalProxyHeaders(r, c.cfg)

	cacheKey, ok := getProxyCacheKey(username, additional)
	if ok {
		// See if we have cached the user id, in that case we can fetch the signed-in user and skip sync.
		// Error here means that we could not find anything in cache, so we can proceed as usual
		if entry, err := c.cache.Get(ctx, cacheKey); err == nil {
			uid, err := strconv.ParseInt(string(entry), 10, 64)
			if err != nil {
				c.log.FromContext(ctx).Warn("Failed to parse user id from cache", "error", err, "userId", string(entry))
			} else {
				return &authn.Identity{
					ID:    authn.NamespacedID(authn.NamespaceUser, uid),
					OrgID: r.OrgID,
					// FIXME: This does not match the actual auth module used, but should not have any impact
					// Maybe caching the auth module used with the user ID would be a good idea
					AuthenticatedBy: login.AuthProxyAuthModule,
					ClientParams: authn.ClientParams{
						FetchSyncedUser: true,
						SyncPermissions: true,
					},
				}, nil
			}
		}
	}

	var clientErr error
	for _, proxyClient := range c.clients {
		var identity *authn.Identity
		identity, clientErr = proxyClient.AuthenticateProxy(ctx, r, username, additional)
		if identity != nil {
			identity.ClientParams.CacheAuthProxyKey = cacheKey
			// Bmc code in next condition
			if inDedicatedInst {
				identity.IsDedicatedInst = true
			}
			return identity, nil
		}
	}

	return nil, clientErr
}

// Bmc code start
// Decides whether a request belongs to master instance or dedicated tenant based on env var and tenant cache
func (c *Proxy) forwardIfRequestForDedicatedTenant(r *authn.Request, userInfo *authz.UserInfo, username string) (bool, error) {
	if username == c.cfg.AdminUser {
		return false, nil
	}
	cache := contexthandler.GetInstance()
	orgId, _ := strconv.ParseInt(userInfo.Tenant_Id, 10, 64)
	tenantExists := true
	if !cache.Exists(userInfo.Tenant_Id) {
		org, _ := c.orgService.GetByID(r.HTTPRequest.Context(), &org.GetOrgByIDQuery{ID: orgId})
		if org != nil {
			cache.Set(string(org.ID), org.Name)
		} else {
			c.log.Info("This request belongs to dedicated tenant", userInfo.Tenant_Id)
			tenantExists = false
		}
	}
	isDedicated, ok := os.LookupEnv("IS_DEDICATED")
	if (!ok || isDedicated != "true") && tenantExists {
		c.log.Debug("This is a master reporting instance.")
		return false, nil
	} else if ((!ok || isDedicated != "true") || (ok && isDedicated == "true")) && !tenantExists {
		c.log.Info("Request belongs to dedicated tenant. Forward this to its ingress.")
		// Request is in master/dedicated instance and it needs to forward the request to dedicated tenant ingress
		return false, errors.New("Request belongs to dedicated tenant. Forward this to its ingress.")
	} else if (ok && isDedicated == "true") && tenantExists {
		c.log.Info("Request is in its dedicated tenant instance.")
		// Request is in its dedicated tenant instance. Check if cookie present or else create one and send in response
		return true, nil
	} else {
		c.log.Error("Request entered in alien area. This is a dedicated instance for tenant ", os.Getenv("DEDICATED_TENANT_ID"))

	}
	return false, nil
}

// Bmc code ends

func (c *Proxy) Test(ctx context.Context, r *authn.Request) bool {
	return len(getProxyHeader(r, c.cfg.AuthProxyHeaderName, c.cfg.AuthProxyHeadersEncoded)) != 0
}

func (c *Proxy) Priority() uint {
	return 50
}

func (c *Proxy) Hook(ctx context.Context, identity *authn.Identity, r *authn.Request) error {
	if identity.ClientParams.CacheAuthProxyKey == "" {
		return nil
	}

	namespace, identifier := identity.GetNamespacedID()
	if namespace != authn.NamespaceUser {
		return nil
	}

	id, err := authidentity.IntIdentifier(namespace, identifier)
	if err != nil {
		c.log.Warn("Failed to cache proxy user", "error", err, "userId", identifier, "err", err)
		return nil
	}

	// User's role would not be updated if the cache hit. If requests arrive in the following order:
	// 1. Name = x; Role = Admin			# cache missed, new user created and cached with key Name=x;Role=Admin
	// 2. Name = x; Role = Editor			# cache missed, the user got updated and cached with key Name=x;Role=Editor
	// 3. Name = x; Role = Admin			# cache hit with key Name=x;Role=Admin, no update, the user stays with Role=Editor
	// To avoid such a problem we also cache the key used using `prefix:[username]`.
	// Then whenever we get a cache miss due to changes in any header we use it to invalidate the previous item.
	username := getProxyHeader(r, c.cfg.AuthProxyHeaderName, c.cfg.AuthProxyHeadersEncoded)
	userKey := fmt.Sprintf("%s:%s", proxyCachePrefix, username)

	// invalidate previously cached user id
	if prevCacheKey, err := c.cache.Get(ctx, userKey); err == nil && len(prevCacheKey) > 0 {
		if err := c.cache.Delete(ctx, string(prevCacheKey)); err != nil {
			return err
		}
	}

	c.log.FromContext(ctx).Debug("Cache proxy user", "userId", id)
	bytes := []byte(strconv.FormatInt(id, 10))
	duration := time.Duration(c.cfg.AuthProxySyncTTL) * time.Minute
	if err := c.cache.Set(ctx, identity.ClientParams.CacheAuthProxyKey, bytes, duration); err != nil {
		c.log.Warn("Failed to cache proxy user", "error", err, "userId", id)
	}

	// store current cacheKey for the user
	return c.cache.Set(ctx, userKey, []byte(identity.ClientParams.CacheAuthProxyKey), duration)
}

func (c *Proxy) isAllowedIP(r *authn.Request) bool {
	if len(c.acceptedIPs) == 0 {
		return true
	}

	host, _, err := net.SplitHostPort(r.HTTPRequest.RemoteAddr)
	if err != nil {
		return false
	}

	ip := net.ParseIP(host)
	for _, v := range c.acceptedIPs {
		if v.Contains(ip) {
			return true
		}
	}

	return false
}

// BMC Code: Starts

// HasValidPermissions checks if the user has valid permissions to access the dashboard
// Todo: check if we can get the username from userInfo
func (c *Proxy) HasValidPermissions(userInfo *authz.UserInfo, username string) error {
	if username == c.cfg.AdminUser {
		return nil
	}
	// make above in a switch
	sort.Strings(userInfo.Permissions)
	switch {
	case bmc.ContainsLower(userInfo.Permissions, "*"):
	case bmc.ContainsLower(userInfo.Permissions, bmc.ReportingViewer):
	case bmc.ContainsLower(userInfo.Permissions, bmc.ReportingEditor):
	case bmc.ContainsLower(userInfo.Permissions, bmc.ReportingAdmin):
		break
	default:
		return errors.New("To get permission to the dashboard. Please contact your admin")
	}

	return nil
}

// BMC code
func (c *Proxy) getRequestUserAuthInfo(r *authn.Request) (*authz.UserInfo, string, string, error) {
	token := getProxyHeader(r, "X-Jwt-Token", false)
	rssoTenant := getProxyHeader(r, "X-Rsso-Tenant", false)
	rssoUsername := getProxyHeader(r, "X-Webauth-User", false)
	if rssoUsername == "" {
		c.log.Error("Failed to get X-Jwt-Token or X-Webauth-User from request", "rssoUsername", rssoUsername, "rssoTenant", rssoTenant, "token", token)
		return nil, rssoUsername, rssoTenant, errors.New("To get permission to the dashboard. Please contact your admin")
	}
	if rssoTenant == "dashboards_superuser_tenant" && rssoUsername == c.cfg.AdminUser {
		return nil, rssoUsername, rssoTenant, nil
	}
	userInfo, err := authz.Authorize(token)
	if err != nil {
		c.log.Error("Failed to authorize user", "error", err.Error())
	}
	return userInfo, rssoUsername, rssoTenant, err
}

// BMC Code: Ends

func parseAcceptList(s string) ([]*net.IPNet, error) {
	if len(strings.TrimSpace(s)) == 0 {
		return nil, nil
	}
	addresses := strings.Split(s, ",")
	list := make([]*net.IPNet, 0, len(addresses))
	for _, addr := range addresses {
		result, err := coerceProxyAddress(addr)
		if err != nil {
			return nil, err
		}
		list = append(list, result)
	}
	return list, nil
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

func getProxyHeader(r *authn.Request, headerName string, encoded bool) string {
	if r.HTTPRequest == nil {
		return ""
	}
	v := r.HTTPRequest.Header.Get(headerName)
	if encoded {
		v = util.DecodeQuotedPrintable(v)
	}
	return v
}

func getAdditionalProxyHeaders(r *authn.Request, cfg *setting.Cfg) map[string]string {
	additional := make(map[string]string, len(proxyFields))
	for _, k := range proxyFields {
		if v := getProxyHeader(r, cfg.AuthProxyHeaders[k], cfg.AuthProxyHeadersEncoded); v != "" {
			additional[k] = v
		}
	}
	return additional
}

func getProxyCacheKey(username string, additional map[string]string) (string, bool) {
	key := strings.Builder{}
	key.WriteString(username)
	for _, k := range proxyFields {
		if v, ok := additional[k]; ok {
			key.WriteString(v)
		}
	}

	hash := fnv.New128a()
	if _, err := hash.Write([]byte(key.String())); err != nil {
		return "", false
	}

	return strings.Join([]string{proxyCachePrefix, hex.EncodeToString(hash.Sum(nil))}, ":"), true
}
