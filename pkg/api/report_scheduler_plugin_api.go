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

			schedulerRoute.Group("/:id", func(schedulerRoute routing.RouteRegister) {
				// Get the report details by id
				schedulerRoute.Get("/", reqEditorRole, routing.Wrap(hs.GetReportByID))

				// Get the report history by id
				schedulerRoute.Get("/history", routing.Wrap(hs.GetReportHistory))
			})

			// Todo: Migrate remaining API routes here -
		})

		apiRoute.Group("/reports", func(schedulerRoute routing.RouteRegister) {
			schedulerRoute.Get("/download/:id", reqEditorRole, routing.Wrap(hs.GetReportJobByID))
		})

	}, reqSignedIn)
}
