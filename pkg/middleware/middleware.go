package middleware

import (
	"fmt"
	"strings"

	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

var (
	ReqGrafanaAdmin = Auth(&AuthOptions{
		ReqSignedIn:     true,
		ReqGrafanaAdmin: true,
	})
	ReqSignedIn            = Auth(&AuthOptions{ReqSignedIn: true})
	ReqSignedInNoAnonymous = Auth(&AuthOptions{ReqSignedIn: true, ReqNoAnonynmous: true})
	ReqEditorRole          = RoleAuth(org.RoleEditor, org.RoleAdmin)
	ReqOrgAdmin            = RoleAuth(org.RoleAdmin)
)

func HandleNoCacheHeader(ctx *models.ReqContext) {
	ctx.SkipCache = ctx.Req.Header.Get("X-Grafana-NoCache") == "true"
}

func AddDefaultResponseHeaders(cfg *setting.Cfg) web.Handler {
	return func(c *web.Context) {
		// BMC code
		addSecurityHeadersTemp(c, cfg)
		// End
		c.Resp.Before(func(w web.ResponseWriter) {
			// if response has already been written, skip.
			if w.Written() {
				return
			}

			if !strings.HasPrefix(c.Req.URL.Path, "/api/datasources/proxy/") {
				addNoCacheHeaders(c.Resp)
			}

			if !cfg.AllowEmbedding {
				addXFrameOptionsDenyHeader(w)
			}

			addSecurityHeaders(w, cfg)
		})
	}
}
// BMC code
// Adding temporary function to add needed security headers.
// ToDo: Check how plain grafana is already handling that and make the necessary to make it work that way.
func addSecurityHeadersTemp(c *web.Context, cfg *setting.Cfg) {
	if cfg.ContentTypeProtectionHeader {
		c.Resp.Header().Add("X-Content-Type-Options", "nosniff")
	}

	if cfg.XSSProtectionHeader {
		c.Resp.Header().Add("X-XSS-Protection", "1; mode=block")
	}

	if !strings.HasPrefix(c.Req.URL.Path, "/api/datasources/proxy/") {
		c.Resp.Header().Add("Cache-Control", "no-cache")
		c.Resp.Header().Add("Pragma", "no-cache")
		c.Resp.Header().Add("Expires", "-1")
	}

	if !cfg.AllowEmbedding {
		c.Resp.Header().Add("X-Frame-Options", "deny")
	}
}

// End

// addSecurityHeaders adds HTTP(S) response headers that enable various security protections in the client's browser.
func addSecurityHeaders(w web.ResponseWriter, cfg *setting.Cfg) {
	if cfg.StrictTransportSecurity {
		strictHeaderValues := []string{fmt.Sprintf("max-age=%v", cfg.StrictTransportSecurityMaxAge)}
		if cfg.StrictTransportSecurityPreload {
			strictHeaderValues = append(strictHeaderValues, "preload")
		}
		if cfg.StrictTransportSecuritySubDomains {
			strictHeaderValues = append(strictHeaderValues, "includeSubDomains")
		}
		w.Header().Set("Strict-Transport-Security", strings.Join(strictHeaderValues, "; "))
	}

	if cfg.ContentTypeProtectionHeader {
		w.Header().Set("X-Content-Type-Options", "nosniff")
	}

	if cfg.XSSProtectionHeader {
		w.Header().Set("X-XSS-Protection", "1; mode=block")
	}
}

func addNoCacheHeaders(w web.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "-1")
}

func addXFrameOptionsDenyHeader(w web.ResponseWriter) {
	w.Header().Set("X-Frame-Options", "deny")
}
