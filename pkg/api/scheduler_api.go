package api

import (
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
)

func (hs *HTTPServer) registerSchedulerRoutes() {
	reqSignedIn := middleware.ReqSignedIn
	reqOrgAdmin := middleware.ReqOrgAdmin
	reqEditorRole := middleware.ReqEditorRole
	reqGrafanaAdmin := middleware.ReqGrafanaAdmin

	r := hs.RouteRegister

	// authed api
	r.Group("/api", func(apiRoute routing.RouteRegister) {

		apiRoute.Group("/reports/:id", func(schedulerRoute routing.RouteRegister) {
			schedulerRoute.Get("/job", routing.Wrap(GetJobQueuesByReportId))
		})

		apiRoute.Group("/reports/job", func(schedulerRoute routing.RouteRegister) {
			schedulerRoute.Get("/info", routing.Wrap(GetReportListJobQueue))
			schedulerRoute.Get("/info/:id", routing.Wrap(GetRSJobQueueByJobId))
		}, reqEditorRole)

		// Report Job Queue/Status (grafana admin permission required).
		// This endpoint will be responsible for creating/updating the executed job status
		apiRoute.Group("/reports/job", func(schedulerRoute routing.RouteRegister) {
			// Add a job in job_queue table as a report scheduler job whenever the process starts
			// And then update it whenever the process finish.
			schedulerRoute.Post("/new", routing.Wrap(InsertRSJobQueue))
			schedulerRoute.Put("/edit", routing.Wrap(UpdateRSJobQueue))
			// Add new status to the related job-queue whenever the job stat changes
			// This will let us know where the report scheduler process has reached
			// such as `started generating report`, `finished generating report`, `broadcasting mail`, etc...
			// also, it will also update if something fail to let us know the reason behind the failure...
			schedulerRoute.Post("/status/new", routing.Wrap(InsertRSJobStatus))
		}, reqGrafanaAdmin)

		apiRoute.Group("/reports", func(schedulerRoute routing.RouteRegister) {
			schedulerRoute.Delete("/orgId/:orgId/isOffboarded/:isOffboarded", routing.Wrap(RemoveOrDisableOrgSchedules))
		}, reqGrafanaAdmin)

		// ReportScheduler Schedulers	 (org admin permission required)
		// This API routing group is reachable with all the roles, it will
		// return the list of scheduled report of the related tenant.
		apiRoute.Group("/reports", func(schedulerRoute routing.RouteRegister) {
			schedulerRoute.Get("/", routing.Wrap(GetRS))
			schedulerRoute.Get("/:id", routing.Wrap(GetRSById))
			schedulerRoute.Post("/dashboard", routing.Wrap(GetRSByDashIds))
			schedulerRoute.Post("/mail", routing.Wrap(ReportSendMail))
			schedulerRoute.Post("/execute", routing.Wrap(ReportExecuteOnce))
			schedulerRoute.Get("/tenant/users", routing.Wrap(GetTenantUsers))
			schedulerRoute.Post("/create", routing.Wrap(InsertRS))
			schedulerRoute.Put("/update", routing.Wrap(UpdateRS))
			schedulerRoute.Post("/delete", routing.Wrap(DeleteRS))
			schedulerRoute.Post("/delete/dashboard", routing.Wrap(DeleteRSByDashIds))
			schedulerRoute.Post("/enable", routing.Wrap(EnableRS))
			schedulerRoute.Post("/disable", routing.Wrap(DisableRS))
		}, reqEditorRole)

		apiRoute.Group("/reports/settings/branding", func(branding routing.RouteRegister) {
			branding.Get("/", routing.Wrap(GetReportBrandingSettings), reqEditorRole)
			branding.Post("/", routing.Wrap(SetReportBrandingSettings), reqOrgAdmin)
			branding.Delete("/", routing.Wrap(DeleteReportBrandingSettings), reqOrgAdmin)
		})

		apiRoute.Group("/reports/tenant_details", func(branding routing.RouteRegister) {
			branding.Post("/", routing.Wrap(CreateOrUpdateReportTenantDetails))
			branding.Delete("/", routing.Wrap(DeleteReportTenantDetails))
		}, reqGrafanaAdmin)

		apiRoute.Group("/reports", func(schedulerRoute routing.RouteRegister) {
			schedulerRoute.Post("/preview", routing.Wrap(ReportPDFPreview))
		}, reqSignedIn)

	}, reqSignedIn)
}
