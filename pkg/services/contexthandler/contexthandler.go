// Package contexthandler contains the ContextHandler service.
package contexthandler

import (
	"context"
	"errors"
	"fmt"

	"net/http"
	"net/http/httputil"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	authnClients "github.com/grafana/grafana/pkg/services/authn/clients"

	"net/url"
	"strconv"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/apimachinery/identity"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/infra/tracing"
	"github.com/grafana/grafana/pkg/services/authn"
	"github.com/grafana/grafana/pkg/services/contexthandler/ctxkey"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/login"
	"github.com/grafana/grafana/pkg/services/user"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

func ProvideService(cfg *setting.Cfg, tracer tracing.Tracer, authenticator authn.Authenticator,
) *ContextHandler {
	return &ContextHandler{
		Cfg:           cfg,
		tracer:        tracer,
		authenticator: authenticator,
	}
}

// ContextHandler is a middleware.
type ContextHandler struct {
	Cfg           *setting.Cfg
	tracer        tracing.Tracer
	authenticator authn.Authenticator
}

type reqContextKey = ctxkey.Key

// FromContext returns the ReqContext value stored in a context.Context, if any.
func FromContext(c context.Context) *contextmodel.ReqContext {
	if reqCtx, ok := c.Value(reqContextKey{}).(*contextmodel.ReqContext); ok {
		return reqCtx
	}
	return nil
}

// CopyWithReqContext returns a copy of the parent context with a semi-shallow copy of the ReqContext as a value.
// The ReqContexts's *web.Context is deep copied so that headers are thread-safe; additional properties are shallow copied and should be treated as read-only.
func CopyWithReqContext(ctx context.Context) context.Context {
	origReqCtx := FromContext(ctx)
	if origReqCtx == nil {
		return ctx
	}

	webCtx := &web.Context{
		Req:  origReqCtx.Req.Clone(ctx),
		Resp: web.NewResponseWriter(origReqCtx.Req.Method, response.CreateNormalResponse(http.Header{}, []byte{}, 0)),
	}
	reqCtx := &contextmodel.ReqContext{
		Context:                    webCtx,
		SignedInUser:               origReqCtx.SignedInUser,
		UserToken:                  origReqCtx.UserToken,
		IsSignedIn:                 origReqCtx.IsSignedIn,
		IsRenderCall:               origReqCtx.IsRenderCall,
		AllowAnonymous:             origReqCtx.AllowAnonymous,
		SkipDSCache:                origReqCtx.SkipDSCache,
		SkipQueryCache:             origReqCtx.SkipQueryCache,
		Logger:                     origReqCtx.Logger,
		Error:                      origReqCtx.Error,
		RequestNonce:               origReqCtx.RequestNonce,
		PublicDashboardAccessToken: origReqCtx.PublicDashboardAccessToken,
		LookupTokenErr:             origReqCtx.LookupTokenErr,
	}
	return context.WithValue(ctx, reqContextKey{}, reqCtx)
}

// Middleware provides a middleware to initialize the request context.
func (h *ContextHandler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		_, span := h.tracer.Start(ctx, "Auth - Middleware")

		reqContext := &contextmodel.ReqContext{
			Context: web.FromContext(ctx),
			SignedInUser: &user.SignedInUser{
				Permissions: map[int64]map[string][]string{},
			},
			IsSignedIn:     false,
			AllowAnonymous: false,
			SkipDSCache:    false,
			Logger:         log.New("context"),
		}

		// inject ReqContext in the context
		ctx = context.WithValue(ctx, reqContextKey{}, reqContext)
		// store list of possible auth header in context
		ctx = WithAuthHTTPHeaders(ctx, h.Cfg)
		// Set the context for the http.Request.Context
		// This modifies both r and reqContext.Req since they point to the same value
		*reqContext.Req = *reqContext.Req.WithContext(ctx)

		ctx = trace.ContextWithSpan(reqContext.Req.Context(), span)
		traceID := tracing.TraceIDFromContext(ctx, false)
		if traceID != "" {
			reqContext.Logger = reqContext.Logger.New("traceID", traceID)
		}

		id, err := h.authenticator.Authenticate(ctx, &authn.Request{HTTPRequest: reqContext.Req})
		if err != nil {
			// BMC change: next block
			if errors.Is(err, authn.ErrInvalidPermission) {
				reqContext.Handle(h.Cfg, 401, "Oops... sorry you dont have access to this Dashboard", err)
			}
			// Bmc code starts
			if errors.Is(err, authn.ErrRequestForDedicatedTenant) {
				reqContext.Logger.Debug("Caught error in handler.", "identity", id.OrgID)
				h.forwardRequestToDedicatedInstance(reqContext, id.OrgID, r, w)
				//reqContext.Handle(h.Cfg, 301, "Request belongs to dedicated tenant instance.", err)
				return
			}
			// Bmc code ends

			// Hack: set all errors on LookupTokenErr, so we can check it in auth middlewares
			reqContext.LookupTokenErr = err
		} else {
			reqContext.SignedInUser = id.SignedInUser()
			reqContext.UserToken = id.SessionToken
			reqContext.IsSignedIn = !reqContext.SignedInUser.IsAnonymous
			reqContext.AllowAnonymous = reqContext.SignedInUser.IsAnonymous
			reqContext.IsRenderCall = id.IsAuthenticatedBy(login.RenderModule)
			// BMC Change: Below block to set context with needed values
			reqContext.BHDRoles = id.BHDRoles
			reqContext.HasExternalOrg = id.HasExternalOrg
			reqContext.MspOrgs = id.MspOrgs
			reqContext.IsUnrestrictedUser = id.IsUnrestrictedUser
			reqContext.OrgRole = id.OrgRoles[id.OrgID]
			// Bmc code starts
			if id.IsDedicatedInst {
				reqContext.Logger.Info("In dedicated instance. Setting a cookie.")
				h.checkAndSetCookie(reqContext, r, w, id.OrgID)
			}
			// Bmc code ends
		}

		h.excludeSensitiveHeadersFromRequest(reqContext.Req)

		reqContext.Logger = reqContext.Logger.New("userId", reqContext.UserID, "orgId", reqContext.OrgID, "uname", reqContext.Login)
		span.AddEvent("user", trace.WithAttributes(
			attribute.String("uname", reqContext.Login),
			attribute.Int64("orgId", reqContext.OrgID),
			attribute.Int64("userId", reqContext.UserID),
		))

		if h.Cfg.IDResponseHeaderEnabled && reqContext.SignedInUser != nil {
			reqContext.Resp.Before(h.addIDHeaderEndOfRequestFunc(reqContext.SignedInUser))
		}

		// End the span to make next handlers not wrapped within middleware span
		span.End()

		next.ServeHTTP(w, r.WithContext(identity.WithRequester(ctx, id)))
	})
}

// Bmc code starts
// This method forwards the request from master/other dedicated instance to the correct dedicated instance ingress.
func (h *ContextHandler) forwardRequestToDedicatedInstance(reqContext *contextmodel.ReqContext, tenantId int64, r *http.Request, w http.ResponseWriter) {
	/*parsedURL, err := url.Parse(r.URL.String())
	if err != nil {
		fmt.Printf("Failed to parse URL: %v\n", err)
		return
	} */
	//h.logger.Debug("@@@@@@ parsedURL is", "parsedURL", parsedURL.String())
	// Get the base URL (scheme + host)
	//baseURL := fmt.Sprintf("%s://%s", "https", r.Host)
	//h.logger.Debug("$$$$$$$$$ baseURL is", "baseURL", baseURL)
	// Get the URI (path + query)
	//uri := parsedURL.RequestURI()
	//h.logger.Debug("$$$$$$$$$ uri is", "uri", uri)
	tenantIdStr := strconv.FormatInt(tenantId, 10)
	/*targetUrl := fmt.Sprintf("%s/dbhd%s/dashboards%s", baseURL, tenantIdStr, uri)
	h.logger.Info("Forwarding dedicated tenant request to url ", "targetUrl", targetUrl)
	targetURL, err := url.Parse(targetUrl)
	if err != nil {
		h.logger.Debug("$$$$$$$$ Could not parse target URL: %v", err)
	}

		h.logger.Info("$$$$$$$$$$$$$$ Creating proxy pass.")
		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		h.logger.Info("$$$$$$$$$$$ Created proxy pass.")
		proxy.ServeHTTP(w, r)
		h.logger.Info("$$$$$$$$$$ Received response from dedicated response.", "status", r.Response.Status) */
	reqContext.Logger.Info("Inside forward request function. Creating reverse proxy.")
	//r.URL.Scheme = "https"
	//r.URL.Path = "/dbhd" + tenantIdStr + "/dashboards"
	//r.URL.Host = r.Host
	dedicatedUrl := url.URL{}
	dedicatedUrl.Scheme = "https"
	dedicatedUrl.Path = "/dbhd" + tenantIdStr + "/dashboards"
	dedicatedUrl.Host = r.Host
	reverseProxy := httputil.NewSingleHostReverseProxy(&dedicatedUrl)
	reqContext.Logger.Info("Reverse proxy instance created.")
	reverseProxy.Director = func(req *http.Request) {
		req.URL.Host = dedicatedUrl.Host
		req.URL.Scheme = dedicatedUrl.Scheme
		req.URL.Path = "/dbhd" + tenantIdStr + "/dashboards"
		//req.Header = make(http.Header)
		//req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
		req.Host = dedicatedUrl.Host
	}
	reqContext.Logger.Info("Forwarding request as reverse proxy ")
	reverseProxy.ServeHTTP(w, r)
	reqContext.Logger.Info("After forwarding from reverse proxy.")
	//})

	/*
		// creating a new request to target url
		proxyReq, err := http.NewRequest(r.Method, targetUrl, r.Body)
		if err != nil {
			h.logger.Error("Failed to create dedicated request: %v", err)
			return
		}

		// Copy the headers from the original request
		h.logger.Debug("$$$$$$$$$ Copying headers from original request")
		proxyReq.Header = make(http.Header)
		for key, values := range r.Header {
			for _, value := range values {
				h.logger.Debug("@@@ header name and value", "key", key, "value", value)
				if key != "Cookie" {
					proxyReq.Header.Add(key, value)
				} else {
					h.logger.Debug("$$$$ Skipping header with key Cookie")
				}

			}
		}

		// Ensure Authorization header is copied if present
		if authHeader := r.Header.Get("Authorization"); authHeader != "" {
			proxyReq.Header.Set("Authorization", authHeader)
			h.logger.Debug(fmt.Sprintf("$$$ Authorization header set with value: %s", authHeader))
		} else {
			h.logger.Warn("$$$ Authorization header not present in the original request")
		}

		// Copy cookies from the original request
		h.logger.Debug("$$$$$$$$$ Copying cookies from original request")
		for _, cookie := range r.Cookies() {
			h.logger.Debug("$$$ cookie name and value", "name", cookie.Name, "value", cookie.Value)
			proxyReq.AddCookie(cookie)
		}

		// Send the request synchronously and forward the response to the client
		client := &http.Client{}
		resp, err := client.Do(proxyReq)
		if err != nil {
			h.logger.Debug("Failed to forward request: %v", err)
			http.Error(w, "Failed to forward request", http.StatusBadGateway)
			return
		}
		h.logger.Info("$$$ Received response from dedicated instance to master.", "status", resp.Status)
		defer resp.Body.Close()

		// Set response headers to match the proxied response
		for key, values := range resp.Header {
			for _, value := range values {
				h.logger.Debug("$$$$ Response header values.", "key", key, "value", value)
				w.Header().Set(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// Copy response body from proxied response to the original response
		if _, err := io.Copy(w, resp.Body); err != nil {
			//h.logger.Printf("Failed to copy response body: %v", err)
			http.Error(w, "Failed to send response", http.StatusInternalServerError)
			return
		}

		h.logger.Debug("Request forwarded with response status: %s", resp.Status)

	*/

	/* Go routing to forward request asynchronously without responding back to the browser
	go func() {
		client := &http.Client{}
		resp, err := client.Do(proxyReq)
		if err != nil {
			reqContext.Logger.Error("Failed to forward request: %v", err)
			return
		}
		defer resp.Body.Close()

		reqContext.Logger.Info("Request forwarded with response status: %s", resp.Status)
	}() */

}

// Bmc code ends

func (h *ContextHandler) excludeSensitiveHeadersFromRequest(req *http.Request) {
	req.Header.Del(authnClients.ExtJWTAuthenticationHeaderName)
	req.Header.Del(authnClients.ExtJWTAuthorizationHeaderName)
}

func (h *ContextHandler) addIDHeaderEndOfRequestFunc(ident identity.Requester) web.BeforeFunc {
	return func(w web.ResponseWriter) {
		if w.Written() {
			return
		}

		id := ident.GetID()
		if !identity.IsIdentityType(
			id,
			identity.TypeUser,
			identity.TypeServiceAccount,
			identity.TypeAPIKey,
		) || id.ID() == "0" {
			return
		}

		if _, ok := h.Cfg.IDResponseHeaderNamespaces[id.Type().String()]; !ok {
			return
		}

		headerName := fmt.Sprintf("%s-Identity-Id", h.Cfg.IDResponseHeaderPrefix)
		w.Header().Add(headerName, id.String())
	}
}

// Bmc code starts
func (h *ContextHandler) checkAndSetCookie(reqContext *contextmodel.ReqContext, r *http.Request, w http.ResponseWriter, tenantId int64) {
	// Check if the cookie is present
	cookie, err := r.Cookie("dbhd")
	if err != nil {
		reqContext.Logger.Info("Creating new dbhd cookie. Error is ", err)
		// If the cookie is not present, create a new one
		if err == http.ErrNoCookie {
			tenantIdStr := strconv.FormatInt(tenantId, 10)
			// Create a new cookie
			newCookie := http.Cookie{
				Name:     "dbhd",
				Value:    tenantIdStr,
				HttpOnly: true, // Accessible only via HTTP(S), not JavaScript
				Secure:   true, // Send only over HTTPS
				Path:     "/",
			}

			// Set the cookie in the response
			http.SetCookie(w, &newCookie)
			reqContext.Logger.Info("Cookie created for dedicated tenant ", tenantId)
			// Inform the client that a new cookie has been set. Remove it once tested
			w.Write([]byte("New session cookie created and set.\n"))
		} else {
			reqContext.Logger.Error("Failed while creating dedicated tenant cookie ", tenantId)
			http.Error(w, "Error retrieving cookie", http.StatusInternalServerError)
			return
		}
	} else {
		// If the cookie is present ignore. Remove it once tested
		reqContext.Logger.Info("Session cookie is already present for tenant ", tenantId)
		w.Write([]byte("Session cookie is already present: " + cookie.Value + "\n"))
	}
}

// Bmc code ends

type authHTTPHeaderListContextKey struct{}

var authHTTPHeaderListKey = authHTTPHeaderListContextKey{}

// AuthHTTPHeaderList used to record HTTP headers that being when verifying authentication
// of an incoming HTTP request.
type AuthHTTPHeaderList struct {
	Items []string
}

// WithAuthHTTPHeaders returns a new context in which all possible configured auth header will be included
// and later retrievable by AuthHTTPHeaderListFromContext.
func WithAuthHTTPHeaders(ctx context.Context, cfg *setting.Cfg) context.Context {
	list := AuthHTTPHeaderListFromContext(ctx)
	if list == nil {
		list = &AuthHTTPHeaderList{
			Items: []string{},
		}
	}

	// used by basic auth, api keys and potentially jwt auth
	list.Items = append(list.Items, "Authorization")

	// remove X-Grafana-Device-Id as it is only used for auth in authn clients.
	list.Items = append(list.Items, "X-Grafana-Device-Id")

	// if jwt is enabled we add it to the list. We can ignore in case it is set to Authorization
	if cfg.JWTAuth.Enabled && cfg.JWTAuth.HeaderName != "" && cfg.JWTAuth.HeaderName != "Authorization" {
		list.Items = append(list.Items, cfg.JWTAuth.HeaderName)
	}

	// if auth proxy is enabled add the main proxy header and all configured headers
	if cfg.AuthProxy.Enabled {
		list.Items = append(list.Items, cfg.AuthProxy.HeaderName)
		for _, header := range cfg.AuthProxy.Headers {
			if header != "" {
				list.Items = append(list.Items, header)
			}
		}
	}

	return context.WithValue(ctx, authHTTPHeaderListKey, list)
}

// AuthHTTPHeaderListFromContext returns the AuthHTTPHeaderList in a context.Context, if any,
// and will include any HTTP headers used when verifying authentication of an incoming HTTP request.
func AuthHTTPHeaderListFromContext(c context.Context) *AuthHTTPHeaderList {
	if list, ok := c.Value(authHTTPHeaderListKey).(*AuthHTTPHeaderList); ok {
		return list
	}
	return nil
}
