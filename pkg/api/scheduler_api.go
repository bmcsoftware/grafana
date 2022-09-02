package api

import (
	"github.com/go-macaron/binding"
	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
)

func (hs *HTTPServer) registerSchedulerRoutes() {
	reqSignedIn := middleware.ReqSignedIn
	reqOrgAdmin := middleware.ReqOrgAdmin
	reqEditorRole := middleware.ReqEditorRole
	reqGrafanaAdmin := middleware.ReqGrafanaAdmin
	bind := binding.Bind

	r := hs.RouteRegister

	// authed api
	r.Group("/api", func(apiRoute routing.RouteRegister) {

		// Report Job Queue/Status (grafana admin permission required).
		// This endpoint will be responsible for creating/updating the executed job status
		apiRoute.Group("/reports/job", func(schedulerRoute routing.RouteRegister) {
			// Add a job in job_queue table as a report scheduler job whenever the process starts
			// And then update it whenever the process finish.
			schedulerRoute.Post("/new", bind(dtos.RSJobQueue{}), routing.Wrap(InsertRSJobQueue))
			schedulerRoute.Put("/edit", bind(dtos.RSJobQueue{}), routing.Wrap(UpdateRSJobQueue))
			// Add new status to the related job-queue whenever the job stat changes
			// (This will let us know where the report scheduler process has reached
			// such as `started generating report`, `finished generating report`, `broadcasting mail`, etc...
			// also it will also update if something fail to let us know the reason behind the failure.
			schedulerRoute.Post("/status/new", bind(dtos.RSJobStatus{}), routing.Wrap(InsertRSJobStatus))
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
			schedulerRoute.Post("/dashboard", bind(dtos.ListRS{}), routing.Wrap(GetRSByDashIds))
			schedulerRoute.Post("/mail", bind(dtos.RSDataSendMail{}), routing.Wrap(ReportSendMail))
			schedulerRoute.Post("/execute", bind(dtos.ListRS{}), routing.Wrap(ReportExecuteOnce))
			schedulerRoute.Get("/tenant/users", routing.Wrap(GetTenantUsers))
			schedulerRoute.Post("/create", bind(dtos.InsertRS{}), routing.Wrap(InsertRS))
			schedulerRoute.Put("/update", bind(dtos.UpdateRS{}), routing.Wrap(UpdateRS))
			schedulerRoute.Post("/delete", bind(dtos.ListRS{}), routing.Wrap(DeleteRS))
			schedulerRoute.Post("/delete/dashboard", bind(dtos.ListRS{}), routing.Wrap(DeleteRSByDashIds))
			schedulerRoute.Post("/enable", bind(dtos.ListRS{}), routing.Wrap(EnableRS))
			schedulerRoute.Post("/disable", bind(dtos.ListRS{}), routing.Wrap(DisableRS))
		}, reqEditorRole)

		apiRoute.Group("/reports/settings/branding", func(branding routing.RouteRegister) {
			branding.Get("/", routing.Wrap(GetReportBrandingSettings))
			branding.Post("/", bind(dtos.RSSettings{}), routing.Wrap(SetReportBrandingSettings))
			branding.Delete("/", routing.Wrap(DeleteReportBrandingSettings))
		}, reqOrgAdmin)

		apiRoute.Group("/reports/tenant_details", func(branding routing.RouteRegister) {
			branding.Post("/", bind(dtos.ReportTenantDetails{}), routing.Wrap(CreateOrUpdateReportTenantDetails))
			branding.Delete("/", routing.Wrap(DeleteReportTenantDetails))
		}, reqGrafanaAdmin)

		apiRoute.Group("/reports", func(schedulerRoute routing.RouteRegister) {
			schedulerRoute.Post("/preview", bind(dtos.RSDataPreview{}), routing.Wrap(ReportPDFPreview))
		}, reqSignedIn)

	}, reqSignedIn)
}
