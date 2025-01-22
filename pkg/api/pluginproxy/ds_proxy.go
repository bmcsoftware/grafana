package pluginproxy

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana/pkg/infra/metrics"
	"github.com/grafana/grafana/pkg/models/roletype"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/grafana/grafana/pkg/api/bmc/external"
	"github.com/grafana/grafana/pkg/api/datasource"
	"github.com/grafana/grafana/pkg/infra/httpclient"
	glog "github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/plugins"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/services/oauthtoken"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/util/proxyutil"
)

var (
	logger = glog.New("data-proxy-log")
	client = newHTTPClient()
	//BMC code
	imsServiceURL = os.Getenv("IMS_SERVICE_URL")
)

type DataSourceProxy struct {
	ds                 *datasources.DataSource
	ctx                *contextmodel.ReqContext
	targetUrl          *url.URL
	proxyPath          string
	matchedRoute       *plugins.Route
	pluginRoutes       []*plugins.Route
	cfg                *setting.Cfg
	clientProvider     httpclient.Provider
	oAuthTokenService  oauthtoken.OAuthTokenService
	dataSourcesService datasources.DataSourceService
	tracer             tracing.Tracer
	features           featuremgmt.FeatureToggles
}

// BMC Code : Start
type JsonWebToken struct {
	JsonWebToken string `json:"json_web_token"`
}

type Filter struct {
	Field     string   `json:"field"`
	Values    []string `json:"values"`
	FieldType string   `json:"fieldType"`
}

type Filters struct {
	Filters []Filter `json:"filters"`
}

type Record struct {
	OrgID       string `json:"org_id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	LeafNode    bool   `json:"leaf_node"`
	OrgNamePath string `json:"org_name_path"`
	Source      string `json:"source"`
	Type        string `json:"type"`
	DefaultOrg  bool   `json:"default_org"`
	Status      string `json:"status"`
	SubTenantID string `json:"sub_tenant_id,omitempty"`
}

type Metadata struct {
	Page           int `json:"page"`
	RecordsPerPage int `json:"records_per_page"`
	PageCount      int `json:"page_count"`
	TotalCount     int `json:"total_count"`
}

type Response struct {
	Records  []Record `json:"records"`
	Metadata Metadata `json:"_metadata"`
}

//BMC Code : End

type httpClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// NewDataSourceProxy creates a new Datasource proxy
func NewDataSourceProxy(ds *datasources.DataSource, pluginRoutes []*plugins.Route, ctx *contextmodel.ReqContext,
	proxyPath string, cfg *setting.Cfg, clientProvider httpclient.Provider,
	oAuthTokenService oauthtoken.OAuthTokenService, dsService datasources.DataSourceService,
	tracer tracing.Tracer, features featuremgmt.FeatureToggles) (*DataSourceProxy, error) {
	targetURL, err := datasource.ValidateURL(ds.Type, ds.URL)
	if err != nil {
		return nil, err
	}

	return &DataSourceProxy{
		ds:                 ds,
		pluginRoutes:       pluginRoutes,
		ctx:                ctx,
		proxyPath:          proxyPath,
		targetUrl:          targetURL,
		cfg:                cfg,
		clientProvider:     clientProvider,
		oAuthTokenService:  oAuthTokenService,
		dataSourcesService: dsService,
		tracer:             tracer,
		features:           features,
	}, nil
}

func newHTTPClient() httpClient {
	return &http.Client{
		Timeout:   30 * time.Second,
		Transport: &http.Transport{Proxy: http.ProxyFromEnvironment},
	}
}

func isPlatformQuery(proxy *DataSourceProxy) bool {
	return strings.Contains(proxy.proxyPath, "api/arsys") || strings.Contains(proxy.proxyPath, "rx/application/chat/helixgpt")
}

func (proxy *DataSourceProxy) HandleRequest() {
	if err := proxy.validateRequest(); err != nil {
		proxy.ctx.JsonApiErr(403, err.Error(), nil)
		return
	}

	proxyErrorLogger := logger.New(
		"userId", proxy.ctx.UserID,
		"orgId", proxy.ctx.OrgID,
		"uname", proxy.ctx.Login,
		"path", proxy.ctx.Req.URL.Path,
		"remote_addr", proxy.ctx.RemoteAddr(),
		"referer", proxy.ctx.Req.Referer(),
	)

	transport, err := proxy.dataSourcesService.GetHTTPTransport(proxy.ctx.Req.Context(), proxy.ds, proxy.clientProvider)
	if err != nil {
		proxy.ctx.JsonApiErr(400, "Unable to load TLS certificate", err)
		return
	}

	modifyResponse := func(resp *http.Response) error {
		if resp.StatusCode == 401 {
			// The data source rejected the request as unauthorized, convert to 400 (bad request)
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return fmt.Errorf("failed to read data source response body: %w", err)
			}
			_ = resp.Body.Close()

			ctxLogger := proxyErrorLogger.FromContext(resp.Request.Context())
			ctxLogger.Info("Authentication to data source failed", "body", string(body), "statusCode",
				resp.StatusCode)
			msg := "Authentication to data source failed"
			*resp = http.Response{
				StatusCode:    400,
				Status:        "Bad Request",
				Body:          io.NopCloser(strings.NewReader(msg)),
				ContentLength: int64(len(msg)),
				Header:        http.Header{},
				Request:       resp.Request,
			}
		} else {
			// BMC code
			//Add Data usage metric
			metric := metrics.MDataSourceProxyResDataSize.WithLabelValues(strconv.FormatInt(proxy.ctx.OrgID, 10), strconv.FormatInt(proxy.ds.ID, 10))
			metric.Add(float64(resp.ContentLength))
		}
		return nil
	}

	reverseProxy := proxyutil.NewReverseProxy(
		proxyErrorLogger,
		proxy.director,
		proxyutil.WithTransport(transport),
		proxyutil.WithModifyResponse(modifyResponse),
	)

	proxy.logRequest()
	ctx, span := proxy.tracer.Start(proxy.ctx.Req.Context(), "datasource reverse proxy")
	defer span.End()

	proxy.ctx.Req = proxy.ctx.Req.WithContext(ctx)

	span.SetAttributes(
		attribute.String("datasource_name", proxy.ds.Name),
		attribute.String("datasource_type", proxy.ds.Type),
		attribute.String("user", proxy.ctx.SignedInUser.Login),
		attribute.Int64("org_id", proxy.ctx.SignedInUser.OrgID),
	)

	proxy.addTraceFromHeaderValue(span, "X-Panel-Id", "panel_id")
	proxy.addTraceFromHeaderValue(span, "X-Dashboard-Id", "dashboard_id")

	proxy.tracer.Inject(ctx, proxy.ctx.Req.Header, span)

	reverseProxy.ServeHTTP(proxy.ctx.Resp, proxy.ctx.Req)
}

func (proxy *DataSourceProxy) addTraceFromHeaderValue(span trace.Span, headerName string, tagName string) {
	panelId := proxy.ctx.Req.Header.Get(headerName)
	dashId, err := strconv.Atoi(panelId)
	if err == nil {
		span.SetAttributes(attribute.Int(tagName, dashId))
	}
}

func (proxy *DataSourceProxy) director(req *http.Request) {
	req.URL.Scheme = proxy.targetUrl.Scheme
	req.URL.Host = proxy.targetUrl.Host
	req.Host = proxy.targetUrl.Host
	ctxLogger := logger.FromContext(req.Context())
	// BMC code
	// change for multiple url configuration in source plugin
	// Obtain JWT Token value in local variable - Fix for DRJ71_4295
	HelixJwtToken := req.Header.Get("X-Jwt-Token")
	_, err := proxy.searchTenantByName(proxy.ds.Name, proxy.ctx.OrgID)
	if (isPlatformQuery(proxy)) && proxy.ds.JsonData != nil {
		s, err := proxy.ds.JsonData.Map()
		if s != nil && len(s) > 0 && err == nil {
			pUrl := s["platformURL"].(string)
			if pUrl != "" {
				parsedUrl, _ := url.Parse(pUrl)
				req.URL.Scheme = parsedUrl.Scheme
				req.URL.Host = parsedUrl.Host
				req.Host = parsedUrl.Host
				proxy.targetUrl = parsedUrl
			}
		} else {
			logger.Error("Datasource url for converged platfrom is not configured correctly.")
			return
		}
	} else if proxy.isITOMApi(proxy.proxyPath) && proxy.ctx.SubTenantId != "" {
		ctxLogger.Debug("ITOM MSP subtenant", "SubTenantId", proxy.ctx.SubTenantId)
		//If msearch call and if itom msp?
		token, err := external.ExchangeIMSToken(proxy.ctx.SubTenantId, HelixJwtToken)
		if err != nil {
			ctxLogger.Error("Error while exchanging token for ITOM MSP subtenant", "error", err)
			return
		}
		HelixJwtToken = token
		ctxLogger.Debug("Token exchange done for ITOM MSP subtenant", "SubTenantId", proxy.ctx.SubTenantId)

	} else if proxy.isITOMApi(proxy.proxyPath) && proxy.ctx.MspOrgs != nil && proxy.ds.Name != "BMC Helix" && proxy.ds.Type == "bmchelix-ade-datasource" {
		subTenantId, err := proxy.searchTenantByName(proxy.ds.Name, proxy.ctx.OrgID)
		if err != nil {
			ctxLogger.Error("Error while fetching subtenant info using datasource name", "proxy.ds.Name", proxy.ds.Name, "error", err)
		}
		if subTenantId != "" {
			ctxLogger.Debug("Found subtenant id for datasource", "proxy.ds.Name", proxy.ds.Name, "subTenantId", subTenantId)
			token, err := external.ExchangeIMSToken(subTenantId, HelixJwtToken)
			if err != nil {
				ctxLogger.Error("Error while exchanging token for ITOM MSP subtenant", "error", err)
				return
			}
			HelixJwtToken = token
			ctxLogger.Debug("Token exchange done for ITOM MSP subtenant", "SubTenantId", subTenantId)
		}
	}
	// End
	reqQueryVals := req.URL.Query()

	switch proxy.ds.Type {
	case datasources.DS_INFLUXDB_08:
		password, err := proxy.dataSourcesService.DecryptedPassword(req.Context(), proxy.ds)
		if err != nil {
			ctxLogger.Error("Error interpolating proxy url", "error", err)
			return
		}

		req.URL.RawPath = util.JoinURLFragments(proxy.targetUrl.Path, "db/"+proxy.ds.Database+"/"+proxy.proxyPath)
		reqQueryVals.Add("u", proxy.ds.User)
		reqQueryVals.Add("p", password)
		req.URL.RawQuery = reqQueryVals.Encode()
	case datasources.DS_INFLUXDB:
		password, err := proxy.dataSourcesService.DecryptedPassword(req.Context(), proxy.ds)
		if err != nil {
			ctxLogger.Error("Error interpolating proxy url", "error", err)
			return
		}
		req.URL.RawPath = util.JoinURLFragments(proxy.targetUrl.Path, proxy.proxyPath)
		req.URL.RawQuery = reqQueryVals.Encode()
		if !proxy.ds.BasicAuth {
			req.Header.Set(
				"Authorization",
				util.GetBasicAuthHeader(proxy.ds.User, password),
			)
		}
	default:
		req.URL.RawPath = util.JoinURLFragments(proxy.targetUrl.Path, proxy.proxyPath)
	}

	unescapedPath, err := url.PathUnescape(req.URL.RawPath)
	if err != nil {
		ctxLogger.Error("Failed to unescape raw path", "rawPath", req.URL.RawPath, "error", err)
		return
	}

	req.URL.Path = unescapedPath

	if proxy.ds.BasicAuth {
		password, err := proxy.dataSourcesService.DecryptedBasicAuthPassword(req.Context(), proxy.ds)
		if err != nil {
			ctxLogger.Error("Error interpolating proxy url", "error", err)
			return
		}
		req.Header.Set("Authorization", util.GetBasicAuthHeader(proxy.ds.BasicAuthUser,
			password))
	}
	//BMC Code (ateli) - start
	//Fix for DRJ71_4295 - Removing X-Jwt-Token from headers if request comes for third party domain

	parts := strings.Split(proxy.targetUrl.Host, ".")
	domain := parts[len(parts)-2] + "." + parts[len(parts)-1]
	if domain != "bmc.com" || domain != "onbmc.com" {
		req.Header.Set("X-Jwt-Token", "")
	}

	if proxy.proxyPath == "api/usagedata" && proxy.ds.Type == datasources.DS_BMC_JSON {
		// vishaln - DRJ71-13468 - Auth check for individual params
		authenticated := false

		APIValuesAndRequiredPermissions := map[string]roletype.RoleType{
			// Viewer role needed for these
			"plugininfo": roletype.RoleViewer,

			// Admin role needed for these
			"usercount":                roletype.RoleAdmin,
			"orgdashboardsstats":       roletype.RoleAdmin,
			"individualdashboardstats": roletype.RoleAdmin,
			"schedule":                 roletype.RoleAdmin,
			"dashboardhitcount":        roletype.RoleAdmin,
			"dashboardloadtime":        roletype.RoleAdmin,
		}

		predefinedQuery := req.URL.Query()["predefinedQuery"]

		if len(predefinedQuery) > 0 {
			reqdRole, ok := APIValuesAndRequiredPermissions[predefinedQuery[0]]
			if ok && proxy.ctx.HasRole(reqdRole) {
				authenticated = true
			}
		}

		if !authenticated {
			ctxLogger.Error(fmt.Sprintf("not authorized to call %v", predefinedQuery), req.URL.RawPath, "error")
			return
		}

		// DRJ71-13174 - ymulthan, vishaln
		username := proxy.cfg.AdminUser
		password := proxy.cfg.AdminPassword

		if username != "" && password != "" {

			// Combine username and password in the format "username:password"
			auth := username + ":" + password

			// Encode the auth string to base64
			encodedAuth := base64.StdEncoding.EncodeToString([]byte(auth))
			req.URL.Scheme = "http"
			req.URL.Host = "127.0.0.1" + ":" + proxy.cfg.HTTPPort
			req.Header.Set("X-DS-Authorization", "")
			req.Header.Set("Authorization", "Basic "+encodedAuth)
			req.Header.Set("X-Jwt-Token", "")
		}
	}
	//BMC Code (ateli) - end
	dsAuth := req.Header.Get("X-DS-Authorization")
	if len(dsAuth) > 0 {
		req.Header.Del("X-DS-Authorization")
		// BMC code
		// Send the rsso auth proxy token to external API - starts
		if HelixJwtToken != "" {
			if (isPlatformQuery(proxy)) {
				dsAuth = "IMS-JWT " + HelixJwtToken
			} else {
				dsAuth = "Bearer " + HelixJwtToken
			}
		}
		// End
		req.Header.Set("Authorization", dsAuth)
	}

	proxyutil.ApplyUserHeader(proxy.cfg.SendUserHeader, req, proxy.ctx.SignedInUser)

	proxyutil.ClearCookieHeader(req, proxy.ds.AllowedCookies(), []string{proxy.cfg.LoginCookieName})
	req.Header.Set("User-Agent", proxy.cfg.DataProxyUserAgent)

	jsonData := make(map[string]any)
	if proxy.ds.JsonData != nil {
		jsonData, err = proxy.ds.JsonData.Map()
		if err != nil {
			ctxLogger.Error("Failed to get json data as map", "jsonData", proxy.ds.JsonData, "error", err)
			return
		}
	}

	if proxy.matchedRoute != nil {
		decryptedValues, err := proxy.dataSourcesService.DecryptedValues(req.Context(), proxy.ds)
		if err != nil {
			ctxLogger.Error("Error interpolating proxy url", "error", err)
			return
		}

		ApplyRoute(req.Context(), req, proxy.proxyPath, proxy.matchedRoute, DSInfo{
			ID:                      proxy.ds.ID,
			URL:                     proxy.ds.URL,
			Updated:                 proxy.ds.Updated,
			JSONData:                jsonData,
			DecryptedSecureJSONData: decryptedValues,
		}, proxy.cfg)
	}

	if proxy.oAuthTokenService.IsOAuthPassThruEnabled(proxy.ds) {
		if token := proxy.oAuthTokenService.GetCurrentOAuthToken(req.Context(), proxy.ctx.SignedInUser); token != nil {
			req.Header.Set("Authorization", fmt.Sprintf("%s %s", token.Type(), token.AccessToken))

			idToken, ok := token.Extra("id_token").(string)
			if ok && idToken != "" {
				req.Header.Set("X-ID-Token", idToken)
			}
		}
	}

	if proxy.features.IsEnabled(req.Context(), featuremgmt.FlagIdForwarding) {
		proxyutil.ApplyForwardIDHeader(req, proxy.ctx.SignedInUser)
	}
}

func (proxy *DataSourceProxy) validateRequest() error {
	if !proxy.checkWhiteList() {
		return errors.New("target URL is not a valid target")
	}

	if proxy.ds.Type == datasources.DS_ES {
		if proxy.ctx.Req.Method == "DELETE" {
			return errors.New("deletes not allowed on proxied Elasticsearch datasource")
		}
		if proxy.ctx.Req.Method == "PUT" {
			return errors.New("puts not allowed on proxied Elasticsearch datasource")
		}
		if proxy.ctx.Req.Method == "POST" && proxy.proxyPath != "_msearch" {
			return errors.New("posts not allowed on proxied Elasticsearch datasource except on /_msearch")
		}
	}

	// found route if there are any
	for _, route := range proxy.pluginRoutes {
		// method match
		if route.Method != "" && route.Method != "*" && route.Method != proxy.ctx.Req.Method {
			continue
		}

		// route match
		if !strings.HasPrefix(proxy.proxyPath, route.Path) {
			continue
		}

		if route.ReqRole.IsValid() {
			if !proxy.ctx.HasUserRole(route.ReqRole) {
				return errors.New("plugin proxy route access denied")
			}
		}

		proxy.matchedRoute = route
		return nil
	}

	// Trailing validation below this point for routes that were not matched
	if proxy.ds.Type == datasources.DS_PROMETHEUS {
		if proxy.ctx.Req.Method == "DELETE" {
			return errors.New("non allow-listed DELETEs not allowed on proxied Prometheus datasource")
		}
		if proxy.ctx.Req.Method == "PUT" {
			return errors.New("non allow-listed PUTs not allowed on proxied Prometheus datasource")
		}
		if proxy.ctx.Req.Method == "POST" {
			return errors.New("non allow-listed POSTs not allowed on proxied Prometheus datasource")
		}
	}

	return nil
}

func (proxy *DataSourceProxy) logRequest() {
	if !proxy.cfg.DataProxyLogging {
		return
	}

	var body string
	if proxy.ctx.Req.Body != nil {
		buffer, err := io.ReadAll(proxy.ctx.Req.Body)
		if err == nil {
			proxy.ctx.Req.Body = io.NopCloser(bytes.NewBuffer(buffer))
			body = string(buffer)
		}
	}

	panelPluginId := proxy.ctx.Req.Header.Get("X-Panel-Plugin-Id")

	ctxLogger := logger.FromContext(proxy.ctx.Req.Context())
	ctxLogger.Info("Proxying incoming request",
		"userid", proxy.ctx.UserID,
		"orgid", proxy.ctx.OrgID,
		"username", proxy.ctx.Login,
		"datasource", proxy.ds.Type,
		"uri", proxy.ctx.Req.RequestURI,
		"method", proxy.ctx.Req.Method,
		"panelPluginId", panelPluginId,
		"body", body)
}

func (proxy *DataSourceProxy) checkWhiteList() bool {
	if proxy.targetUrl.Host != "" && len(proxy.cfg.DataProxyWhiteList) > 0 {
		if _, exists := proxy.cfg.DataProxyWhiteList[proxy.targetUrl.Host]; !exists {
			proxy.ctx.JsonApiErr(403, "Data proxy hostname and ip are not included in whitelist", nil)
			return false
		}
	}

	return true
}

// BMC Code : Start
func (proxy *DataSourceProxy) isITOMApi(proxyPath string) bool {
	itomUrl := []string{}
	itomUrl = append(itomUrl, "api/v1/catalogproxy")
	itomUrl = append(itomUrl, "api/v1/datamartservice")
	itomUrl = append(itomUrl, "audit-api/api")
	itomUrl = append(itomUrl, "cloudsecurity/api")
	itomUrl = append(itomUrl, "events-service/api")
	itomUrl = append(itomUrl, "logs-service/api")
	itomUrl = append(itomUrl, "metrics-query-service/api")
	itomUrl = append(itomUrl, "managed-object-service/api")
	itomUrl = append(itomUrl, "smart-graph-api/api")
	for _, url := range itomUrl {
		if strings.Contains(proxyPath, url) {
			return true
		}
	}
	return false
}

func (proxy *DataSourceProxy) searchTenantByName(dsName string, tenantId int64) (string, error) {
	serviceAccountToken, err := external.GetServiceAccountToken(tenantId)
	if err != nil {
		return "", errors.New("Failed to get service account token")
	}

	if serviceAccountToken == "" {
		return "", errors.New("JWT token is not set")
	}
	if dsName == "" {
		return "", errors.New("Tenant Name is missing")
	}
	url := imsServiceURL + "/ims/api/v1/organizations/search"
	method := "POST"

	filters := Filters{Filters: []Filter{{Field: "name", Values: []string{dsName}, FieldType: "string"}}}
	payload, err := json.Marshal(filters)
	req, err := http.NewRequest(method, url, bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+serviceAccountToken)

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		logger.Info("org search api call failed", "dsName", dsName, "res.StatusCode", res.StatusCode)
		return "", fmt.Errorf("unauthorized")
	}

	response := Response{}
	err = json.NewDecoder(res.Body).Decode(&response)
	if err != nil {
		return "", err
	}
	for _, record := range response.Records {
		if record.Name == dsName && record.SubTenantID != "" {
			return record.SubTenantID, nil
		}
	}
	return "", nil
}

//BMC Code : End
