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
	store    sqlstore.Store
}

// NewPluginsAPI returns a new instance of PluginsAPI.
func NewPluginsAPI(r routing.RouteRegister, s sqlstore.Store, d dashboards.DashboardService, lp libraryelements.Service) *PluginsAPI {
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
