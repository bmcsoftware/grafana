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
