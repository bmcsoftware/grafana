package bhd_rbac

import (
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

const (
	ACCESS   = "access"
	READ     = "read"
	WRITE    = "write"
	DOWNLOAD = "download"
	CREATE = "create"
)

var (
	OrgRoleAdmin       = []org.RoleType{org.RoleAdmin, org.RoleEditor}
	OrgRoleAdminEditor = []org.RoleType{org.RoleAdmin, org.RoleEditor}
	OrgRoleAll         = []org.RoleType{org.RoleAdmin, org.RoleEditor, org.RoleViewer}
)

// Middleware for RBAC permissions check for each resource and action combination
var (
	CanAccessReports        = RbacMiddleware("reports", ACCESS, OrgRoleAdminEditor)
	CanViewReportsHistory   = RbacMiddleware("reports.history", READ, OrgRoleAdmin)
	CanViewReportsSettings  = RbacMiddleware("reports.settings", READ, OrgRoleAdmin)
	CanWriteReportsSettings = RbacMiddleware("reports.settings", WRITE, OrgRoleAdmin)
	CanDownloadReports      = RbacMiddleware("dashboards", DOWNLOAD, OrgRoleAll)
	CanReadCalculatedFields = RbacMiddleware("calculated.fields", READ, OrgRoleAdminEditor)
	CanCreateCalculatedFields = RbacMiddleware("calculated.fields", CREATE, OrgRoleAdminEditor)
)

func RbacMiddleware(resource, action string, fallbackRole []org.RoleType) web.Handler {
	return func(c *contextmodel.ReqContext) {
		for _, role := range fallbackRole {
			if c.OrgRole == role {
				// Todo: Fix me to fallback using org role
				return
			}
		}
		ok := c.HasBHDPermission(resource, action)
		if !ok {
			accessForbidden(c)
		}
	}
}

func accessForbidden(c *contextmodel.ReqContext) {
	if c.IsApiRequest() {
		c.JsonApiErr(403, "Permission denied", nil)
		return
	}

	c.Redirect(setting.AppSubUrl + "/")
}

