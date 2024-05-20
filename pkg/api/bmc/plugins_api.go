package bmc

import (
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/libraryelements"
	"github.com/grafana/grafana/pkg/services/sqlstore"
)

type PluginsAPI struct {
	route    routing.RouteRegister
	dashSvc  dashboards.DashboardService
	panelSvc libraryelements.Service
	store    sqlstore.SQLStore
}

// NewPluginsAPI returns a new instance of PluginsAPI.
func NewPluginsAPI(r routing.RouteRegister, s sqlstore.SQLStore, d dashboards.DashboardService, lp libraryelements.Service) *PluginsAPI {
	return &PluginsAPI{
		route:    r,
		store:    s,
		dashSvc:  d,
		panelSvc: lp,
	}
}

func (p *PluginsAPI) RegisterImportExportBackendPlugin() {
	p.route.Group("/api/bmc", func(apiRoute routing.RouteRegister) {
		apiRoute.Post("/import-dashboards", p.ImportPlugin)
		apiRoute.Post("/export-dashboards", p.ExportPlugin)
	}, middleware.ReqSignedIn)
}

func (p *PluginsAPI) RegisterCustomPersonalizationBackendPlugin() {
	p.route.Group("/api/bmc", func(apiRoute routing.RouteRegister) {
		apiRoute.Get("/dashboard/:uid/personalization", p.GetCustomPersonalization)
		apiRoute.Post("/dashboard/:uid/personalization", p.SaveCustomPersonalization)
		apiRoute.Delete("/dashboard/:uid/personalization", p.DeleteDashPersonalization)
	}, middleware.ReqSignedIn)
}

func (p *PluginsAPI) RegisterMiscellaneousRoutes() {
	// register routes available to only grafana admin
	p.route.Group("/api/bmc", func(apiRoute routing.RouteRegister) {
		apiRoute.Post("/updatedb", p.RunUpsert)
	}, middleware.ReqGrafanaAdmin)
}

// RegisterRoutes registers routes for the variable API.
func (p *PluginsAPI) ExternalDashboardsApi() {
	p.route.Group("/api/external", func(apiRoute routing.RouteRegister) {
		apiRoute.Get("/dashboards", p.getAllDashboards)
		apiRoute.Get("/dashboards/:uid", p.getVariablesMetadata)
	})
}

func (p *PluginsAPI) RegisterCustomRBACBackendPlugin() {
	p.route.Group("/api", func(apiRoute routing.RouteRegister) {
		apiRoute.Group("/rbac", func(rbacRoute routing.RouteRegister) {
			rbacRoute.Group("/roles", func(rolesRoute routing.RouteRegister) {
				rolesRoute.Post("/", middleware.ReqOrgAdmin, p.CreateBHDRole)
				rolesRoute.Get("/:roleId", middleware.ReqOrgAdmin, p.GetBHDRole)
				rolesRoute.Post("/:roleId", middleware.ReqOrgAdmin, p.UpdateBHDRole)
				rolesRoute.Delete("/:roleId", middleware.ReqOrgAdmin, p.DeleteBHDRole)
				rolesRoute.Get("/", middleware.ReqOrgAdmin, p.SearchBHDRoles)

				//Users
				rolesRoute.Post("/:roleId/users", middleware.ReqOrgAdmin, p.UpdateUsersRole)

				//Teams
				rolesRoute.Post("/:roleId/teams", middleware.ReqOrgAdmin, p.UpdateTeamsRole)

				//Permission
				rolesRoute.Get("/:roleId/permissions", middleware.ReqOrgAdmin, p.GetRolePermissions)
				rolesRoute.Post("/:roleId/permissions", middleware.ReqOrgAdmin, p.UpdateRolePermissions)
			})
			rbacRoute.Group("/users", func(usersRoute routing.RouteRegister) {
				usersRoute.Get("/", middleware.ReqOrgAdmin, p.SearchUser)
				usersRoute.Post("/:userId/role", middleware.ReqOrgAdmin, p.AddUserBHDRole)
				usersRoute.Delete("/:userId/role/:roleId", middleware.ReqOrgAdmin, p.RemoveUserBHDRole)
				usersRoute.Delete("/:userId/role", middleware.ReqOrgAdmin, p.RemoveUserBHDRole)

			})
			rbacRoute.Group("/teams", func(teamsRoute routing.RouteRegister) {
				teamsRoute.Get("/", middleware.ReqOrgAdmin, p.SearchTeam)
				teamsRoute.Post("/:teamId/role", middleware.ReqOrgAdmin, p.AddTeamBHDRole)
				teamsRoute.Delete("/:teamId/role/:roleId", middleware.ReqOrgAdmin, p.RemoveTeamBHDRole)
				teamsRoute.Delete("/:teamId/role", middleware.ReqOrgAdmin, p.RemoveTeamBHDRole)
			})
		})
	}, middleware.ReqSignedIn)
}
