package bhd_rbac

import (
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web"
)

const (
	READ   = "read"
	CREATE = "create"
	WRITE  = "write"
	DELETE = "delete"
)

// Middleware for RBAC permissions check for each resource and action combination
var (
	CanReadDashboards   = RbacMiddleware("dashboards", READ)
	CanWriteDashboards  = RbacMiddleware("dashboards", WRITE)
	CanDeleteDashboards = RbacMiddleware("dashboards", DELETE)

	CanReadFolders   = RbacMiddleware("folders", READ)
	CanWriteFolders  = RbacMiddleware("folders", WRITE)
	CanDeleteFolders = RbacMiddleware("folders", DELETE)

	CanReadUsers   = RbacMiddleware("users", READ)
	CanWriteUsers  = RbacMiddleware("users", WRITE)
	CanDeleteUsers = RbacMiddleware("users", DELETE)

	CanReadTeams   = RbacMiddleware("teams", READ)
	CanWriteTeams  = RbacMiddleware("teams", WRITE)
	CanDeleteTeams = RbacMiddleware("teams", DELETE)

	CanReadPreferences   = RbacMiddleware("preferences", READ)
	CanWritePreferences  = RbacMiddleware("preferences", WRITE)
	CanDeletePreferences = RbacMiddleware("preferences", DELETE)

	CanReadDatasources   = RbacMiddleware("datasources", READ)
	CanWriteDatasources  = RbacMiddleware("datasources", WRITE)
	CanDeleteDatasources = RbacMiddleware("datasources", DELETE)

	CanReadReports          = RbacMiddleware("reports", READ)
	CanWriteReports         = RbacMiddleware("reports", WRITE)
	CanDeleteReports        = RbacMiddleware("reports", DELETE)
	CanReadReportsHistory   = RbacMiddleware("reports.history", READ)
	CanReadReportsSettings  = RbacMiddleware("reports.settings", READ)
	CanWriteReportsSettings = RbacMiddleware("reports.settings", WRITE)

	CanReadRole   = RbacMiddleware("roles", READ)
	CanWriteRole  = RbacMiddleware("roles", WRITE)
	CanDeleteRole = RbacMiddleware("roles", DELETE)
)

func RbacMiddleware(resource, action string) web.Handler {
	return func(c *contextmodel.ReqContext) {
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
