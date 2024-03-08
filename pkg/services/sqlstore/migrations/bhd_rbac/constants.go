package mig_rbac

import (
	"github.com/grafana/grafana/pkg/infra/log"
	"strings"
)

var Log = log.New("bmc-rbac-api")

type BhdPermission struct {
	Name  string
	Group string
}

var bhdRoleAdminPermissions = []string{
	"dashboards:read",
	"dashboards:create",
	"dashboards:write",
	"dashboards:delete",
	"folders:read",
	"folders:create",
	"folders:write",
	"folders:delete",
	"users:read",
	"users:create",
	"users:write",
	"users:delete",
	"teams:read",
	"teams:create",
	"teams:write",
	"teams:delete",
	"datasources:read",
	"datasources:create",
	"datasources:write",
	"datasources:delete",
	"preferences:read",
	"preferences:write",
	"roles:read",
	"roles:create",
	"roles:write",
	"roles:delete",
	"reports:read",
	"reports:create",
	"reports:write",
	"reports:delete",
	"reports:export",
	"reports:run",
	"reports.history:read",
	"reports.settings:write",
	"reports.settings:read",
}

var bhdRoleEditorPermissions = []string{
	"dashboards:read",
	"dashboards:create",
	"dashboards:write",
	"dashboards:delete",
	"folders:read",
	"folders:create",
	"folders:write",
	"folders:delete",
	"users:read",
	"teams:read",
	"datasources:read",
	"preferences:read",
	"preferences:write",
	"reports:read",
	"reports:create",
	"reports:write",
	"reports:delete",
	"reports:export",
	"reports:run",
	"reports.settings:read",
}

var bhdRoleViewerPermissions = []string{
	"dashboards:read",
	"folders:read",
}

func GetBhdPermissionFromString(name string) BhdPermission {
	parts := strings.Split(name, ":")
	resource := parts[0]

	group := strings.Replace(resource, ".", " ", -1)
	group = strings.Title(group)

	return BhdPermission{
		Name:  name,
		Group: group,
	}
}

func GetBhdPermissionsFromArrayString(names []string) []BhdPermission {
	permissions := make([]BhdPermission, 0)
	for _, name := range names {
		permissions = append(permissions, GetBhdPermissionFromString(name))
	}
	return permissions
}

var BhdSupportedPermissions = GetBhdPermissionsFromArrayString(bhdRoleAdminPermissions)
var BhdBuiltInAdminPermissions = GetBhdPermissionsFromArrayString(bhdRoleAdminPermissions)
var BhdBuiltInEditorPermissions = GetBhdPermissionsFromArrayString(bhdRoleEditorPermissions)
var BhdBuiltInViewerPermissions = GetBhdPermissionsFromArrayString(bhdRoleViewerPermissions)
