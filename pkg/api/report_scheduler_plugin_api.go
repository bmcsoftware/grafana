package api

import (
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
)

// Todo: Will be migrating all related report scheduler files to one single package
func (hs *HTTPServer) registerReportSchedulerPlugin() {
	reqSignedIn := middleware.ReqSignedIn
	reqOrgAdmin := middleware.ReqOrgAdmin
	reqEditorRole := middleware.ReqEditorRole
	//reqGrafanaAdmin := middleware.ReqGrafanaAdmin

	r := hs.RouteRegister

	// Plugin UI Path
	r.Group("/a/reports", func(route routing.RouteRegister) {
		r.Get("/history", reqOrgAdmin, hs.Index)
		r.Get("/settings", reqOrgAdmin, hs.Index)
	}, reqSignedIn)

	// authed api
	r.Group("/api/v2", func(apiRoute routing.RouteRegister) {
		apiRoute.Group("/reports", func(schedulerRoute routing.RouteRegister) {
			schedulerRoute.Get("/", reqEditorRole, routing.Wrap(hs.GetAllReports))
			schedulerRoute.Get("/:id", reqEditorRole, routing.Wrap(hs.GetReportByID))
			schedulerRoute.Get("/:id/history", routing.Wrap(hs.GetReportHistory))
			schedulerRoute.Get("/:id/download", reqEditorRole, routing.Wrap(hs.GetReportJobByID))

			schedulerRoute.Post("/", reqEditorRole, routing.Wrap(hs.CreateReport))
			schedulerRoute.Put("/:id", reqEditorRole, routing.Wrap(hs.UpdateReport))
			schedulerRoute.Delete("/", reqEditorRole, routing.Wrap(hs.DeleteReport))
			// Todo: Migrate remaining API routes here -
		})
		
	}, reqSignedIn)
}
