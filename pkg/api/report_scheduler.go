package api

import (
	"context"
	"errors"
	"fmt"
	"github.com/grafana/grafana/pkg/api/bmc/external"
	"net/http"
	"time"

	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/components/simplejson"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/org"
	rs "github.com/grafana/grafana/pkg/services/scheduler"
	"github.com/grafana/grafana/pkg/web"
)

var (
	OK      = 1
	WARNING = 2
	ERROR   = 3

	Created     = "Report is successfully created"
	Updated     = "Report is successfully updated"
	DeletedOne  = "Report is successfully deleted"
	DeletedMany = "Reports are successfully deleted"
	EnableOne   = "Report is successfully enabled"
	EnableMany  = "Reports are successfully enabled"
	DisableOne  = "Report is successfully disabled"
	DisableMany = "Reports are successfully disabled"
	Executed    = "Report is successfully executed"
)

// -------------- Controllers To Queries Dispatchers  -------------- //
func (hs *HTTPServer) DeleteRSByDashIds(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := models.DeleteRSByDashIds{Ids: cmd.Ids, UserId: c.UserID, OrgId: c.OrgID}
	if err := hs.SQLStore.DeleteRSByDashIds(c.Req.Context(), &query); err != nil {
		return hs.FailResponse(err)
	}
	message := DeletedOne
	if len(cmd.Ids) > 1 {
		message = DeletedMany
	}
	return hs.SuccessResponse(CustomResponse{Ids: cmd.Ids, Message: message})
}

func (hs *HTTPServer) EnableRS(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := models.EnableRS{Ids: cmd.Ids, UserId: c.UserID, OrgId: c.OrgID, IsOrgAdmin: c.OrgRole == org.RoleAdmin}
	if err := hs.SQLStore.EnableRS(c.Req.Context(), &query); err != nil {
		return hs.FailResponse(err)
	}
	message := EnableOne
	if len(cmd.Ids) > 1 {
		message = EnableMany
	}
	return hs.SuccessResponse(CustomResponse{Ids: cmd.Ids, Message: message})
}
func (hs *HTTPServer) DisableRS(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := models.DisableRS{Ids: cmd.Ids, UserId: c.UserID, OrgId: c.OrgID, IsOrgAdmin: c.OrgRole == org.RoleAdmin}
	if err := hs.SQLStore.DisableRS(c.Req.Context(), &query); err != nil {
		return hs.FailResponse(err)
	}

	message := DisableOne
	if len(cmd.Ids) > 1 {
		message = DisableMany
	}
	return hs.SuccessResponse(CustomResponse{Ids: cmd.Ids, Message: message})
}

func (hs *HTTPServer) ReportPDFPreview(c *models.ReqContext) response.Response {
	cmd := dtos.RSDataPreview{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	cmd.Name = util.SanitizeHtml(cmd.Name)
	cmd.Description = util.SanitizeHtml(cmd.Description)

	cmd.OrgId = c.OrgID
	cmd.UserId = c.UserID

	body, status, err := rs.PreviewPDF(cmd)
	if err != nil {
		return response.Error(status, err.Error(), err)
	}

	headers := make(http.Header)
	headers.Set("Content-Type", "application/pdf")
	return response.CreateNormalResponse(headers, body, 200)
}

func (hs *HTTPServer) ReportSendMail(c *models.ReqContext) response.Response {
	cmd := dtos.RSDataSendMail{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	// Sanitize fields
	cmd.Name = util.SanitizeHtml(cmd.Name)
	cmd.Description = util.SanitizeHtml(cmd.Description)
	cmd.Subject = util.SanitizeHtml(cmd.Subject)
	cmd.Message = util.SanitizeHtml(cmd.Message)

	cmd.UserId = c.UserID
	cmd.OrgId = c.OrgID

	settings, err := hs.getReportSchedulerSettings(c)
	if err == nil {
		isInternalDomain := settings.InternalDomainsOnly
		hasWhitelistedDomains := len(settings.WhitelistedDomains) > 0
		if isInternalDomain {
			validRecipients, err := external.FilterInternalUsersByEmails(c, cmd.Recipients)
			if err != nil {
				return response.Error(http.StatusBadRequest, "Domain restriction failed", err)
			}
			if len(validRecipients) != len(cmd.Recipients) {
				return response.Error(http.StatusPreconditionFailed, "Some recipients are not internal users", err)
			}
			cmd.Recipients = validRecipients
		} else if hasWhitelistedDomains {
			// check if recipients are in whitelist
			validRecipients := util.EmailDomainValidator(cmd.Recipients, settings.WhitelistedDomains)
			if len(cmd.Recipients) != len(validRecipients) {
				return response.Error(http.StatusPreconditionFailed, "Some recipients are not in whitelist", err)
			}
		}
	}

	body, err := rs.PreviewMail(cmd)
	if err != nil {
		return response.Error(500, err.Error(), err)
	}

	headers := make(http.Header)
	headers.Set("Content-Type", "application/json")
	return response.CreateNormalResponse(headers, body, 200)
}

func (hs *HTTPServer) ReportExecuteOnce(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	if len(cmd.Ids) == 0 {
		return response.Error(400, "ID is not specified", nil)
	}

	query := &models.GetJobById{
		Id:         cmd.Ids[0],
		UserId:     c.UserID,
		OrgId:      c.OrgID,
		IsOrgAdmin: c.OrgRole == org.RoleAdmin,
	}
	result, err := hs.SelectJobById(c.Req.Context(), query)
	if err != nil {
		return response.Error(500, err.Error(), err)
	}

	recipients := util.SplitStr(result.Recipients)
	payload := dtos.RSDataExecute{
		RSDataSendMail: dtos.RSDataSendMail{
			RSDataPreview: dtos.RSDataPreview{
				Id:          result.Id,
				UserId:      c.UserID,
				OrgId:       c.OrgID,
				Name:        result.Name,
				UID:         result.Uid,
				TimeRange:   result.TimeRange,
				Filter:      result.Filter,
				Orientation: result.Orientation,
				Layout:      result.Layout,
				Variables:   &simplejson.Json{},
				Timezone:    result.Timezone,
				Description: result.Description,
				ReportType:  result.ReportType,
			},
			Subject:    result.Subject,
			Recipients: recipients,
			Message:    result.Message,
			Cron:       result.Cron,
		},
		DashName:     result.DashName,
		ScheduleType: result.ScheduleType,
		ServerDir:    result.ServerDir,
		HasDateStamp: result.HasDateStamp,
		HasTimeStamp: result.HasTimeStamp,
	}

	body, err := rs.ExecuteOnce(payload)
	if err != nil {
		return response.Error(500, err.Error(), err)
	}

	headers := make(http.Header)
	headers.Set("Content-Type", "application/json")
	return response.CreateNormalResponse(headers, body, 200)
}

func (hs *HTTPServer) GetTenantUsers(c *models.ReqContext) response.Response {
	result := hs.getTenantUsers(c)
	return response.JSON(200, result)
}

// -------------- Queries Dispatchers to SQLStore -------------- //
func (hs *HTTPServer) SelectAll(ctx context.Context, query *models.GetAll) ([]*models.RSData, error) {
	if err := hs.SQLStore.GetAllRS(ctx, query); err != nil {
		return nil, err
	}
	return query.Result, nil
}
func (hs *HTTPServer) SelectById(ctx context.Context, query *models.GetById) (*models.RSData, error) {
	if err := hs.SQLStore.GetRSById(ctx, query); err != nil {
		return nil, err
	}
	return query.Result, nil
}

func (hs *HTTPServer) SelectByDashIds(ctx context.Context, query *models.GetByDashIds) ([]*models.RSData, error) {
	if err := hs.SQLStore.GetRSByDashIds(ctx, query); err != nil {
		return nil, err
	}
	return query.Result, nil
}

func (hs *HTTPServer) SelectJobById(ctx context.Context, query *models.GetJobById) (*models.ExecuteRS, error) {
	if err := hs.SQLStore.ExecuteRS(hs.DashboardService, ctx, query); err != nil {
		return nil, err
	}
	return query.Result, nil
}

func (hs *HTTPServer) InsertRSJobQueue(c *models.ReqContext) response.Response {
	cmd := dtos.RSJobQueue{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := &models.InsertRSJobQueue{
		ElapsedTime: 0,
		StartedAt:   cmd.StartedAt,
		ReportId:    cmd.ReportId,
	}
	if err := hs.SQLStore.InsertRSJobQueue(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(CustomResponse{Id: query.Id})
}
func (hs *HTTPServer) UpdateRSJobQueue(c *models.ReqContext) response.Response {
	cmd := dtos.RSJobQueue{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := &models.UpdateRSJobQueue{
		Id:          cmd.Id,
		ElapsedTime: cmd.ElapsedTime,
		FinishedAt:  cmd.FinishedAt,
	}
	if err := hs.SQLStore.UpdateRSJobQueue(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(CustomResponse{})
}
func (hs *HTTPServer) InsertRSJobStatus(c *models.ReqContext) response.Response {
	cmd := dtos.RSJobStatus{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := &models.InsertRSJobStatus{
		JobId:       cmd.JobId,
		Status:      cmd.Status,
		Created:     time.Now().UTC(),
		Description: cmd.Description,
	}
	if err := hs.SQLStore.InsertRSJobStatus(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(CustomResponse{})
}

func (hs *HTTPServer) RemoveOrDisableOrgSchedules(c *models.ReqContext) response.Response {
	orgId, err := util.ParamsInt64(web.Params(c.Req)[":orgId"])
	if err != nil {
		return hs.FailResponse(models.ErrInvalidId)
	}

	isOffboarded, err := util.ParamsBool(web.Params(c.Req)[":isOffboarded"])
	if err != nil {
		return hs.FailResponse(err)
	}
	query := &models.RemoveOrDisableOrgSchedules{
		OrgId:        orgId,
		IsOffboarded: isOffboarded,
	}

	if err := hs.SQLStore.RemoveOrDisableOrgSchedules(c.Req.Context(), query); err != nil {
		if isOffboarded {
			return response.Error(500, "Failed to delete report schedules for the org.", err)
		} else {
			return response.Error(500, "Failed to disable report schedules for the org.", err)
		}
	}
	return response.JSON(200, "Report schedules deleted/disabled successfully.")
}

type CustomResponse struct {
	Id      int64   `json:"id,omitempty"`
	Ids     []int64 `json:"ids,omitempty"`
	Message string  `json:"message,omitempty"`
}

func (hs *HTTPServer) SuccessResponse(res interface{}) response.Response {
	return response.JSON(200, res)
}

func (hs *HTTPServer) FailResponse(err error) response.Response {
	switch err {
	case models.ErrReportSchedulerNotFound:
		return response.JSON(404, CustomResponse{Message: err.Error()})
	case models.ErrReportSchedulerListEmpty:
		return response.JSON(400, CustomResponse{Message: err.Error()})
	case models.ErrReportSchedulerNameExists:
		return response.JSON(400, CustomResponse{Message: err.Error()})
	case models.ErrInvalidId:
		return response.JSON(400, CustomResponse{Message: err.Error()})
	case models.ErrMissingData:
		return response.JSON(400, CustomResponse{Message: err.Error()})
	case models.ErrReportTenantDetailsLimitReached:
		return response.JSON(400, CustomResponse{Message: err.Error()})
	case models.ErrReportTenantDetailsLimitNotFound:
		return response.JSON(404, CustomResponse{Message: err.Error()})
	default:
		return response.JSON(500, CustomResponse{Message: err.Error()})
	}
}

func (hs *HTTPServer) GetReportTenantDetails(c *models.ReqContext) response.Response {
	result, err := hs.getReportTenant(c.Req.Context(), c.OrgID)
	if err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(result)
}

func (hs *HTTPServer) CreateOrUpdateReportTenantDetails(c *models.ReqContext) response.Response {
	cmd := dtos.ReportTenantDetails{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	if err := hs.setReportTenantDetails(c.Req.Context(), c.OrgID, cmd); err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(CustomResponse{Message: "Updated."})
}

func (hs *HTTPServer) DeleteReportTenantDetails(c *models.ReqContext) response.Response {
	query := models.DeleteReportTenantDetails{
		OrgId: c.OrgID,
	}
	if err := hs.SQLStore.DeleteReportOrg(c.Req.Context(), &query); err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(CustomResponse{Message: "Deleted."})
}

func (hs *HTTPServer) getReportTenant(ctx context.Context, orgId int64) (*dtos.ReportTenantDetails, error) {
	query := models.GetReportTenantDetails{OrgId: orgId}
	if err := hs.SQLStore.GetReportOrg(ctx, &query); err != nil {
		return nil, err
	}
	return &dtos.ReportTenantDetails{
		Type:  query.Result.Type,
		Limit: query.Result.Limit,
	}, nil
}
func (hs *HTTPServer) getReportCountByTenantId(ctx context.Context, orgId int64) (*int64, error) {
	query := models.GetCountReportByTenant{OrgId: orgId}
	if err := hs.SQLStore.CountReportsByTenant(ctx, &query); err != nil {
		return nil, err
	}
	return query.Result, nil
}
func (hs *HTTPServer) setReportTenantDetails(ctx context.Context, orgId int64, reportDetails dtos.ReportTenantDetails) error {
	query := models.CreateOrUpdateReportTenantDetails{
		OrgId: orgId,
		ReportTenantDetails: models.ReportTenantDetails{
			Type:  reportDetails.Type,
			Limit: reportDetails.Limit,
		},
	}
	return hs.SQLStore.CreateOrUpdateReportOrg(ctx, &query)
}
func (hs *HTTPServer) checkReportLimitReached(ctx context.Context, orgId int64) error {
	var err error
	var reportCount *int64
	tenantDetails := &dtos.TenantDetails{}
	reportTenantDetails := &dtos.ReportTenantDetails{}

	// Get tenant details
	if reportTenantDetails, err = hs.getReportTenant(ctx, orgId); err != nil {

		if !errors.Is(err, models.ErrReportTenantDetailsLimitNotFound) {
			return err
		}

		// Get tenant details from TMS api
		fmt.Println("Getting tenant details from tms api")
		if tenantDetails, err = rs.GetTenantDetails(orgId); err != nil {
			return err
		}
		// Populate report tenant details when there is no record in database
		// with default value.
		tenantType := tenantDetails.Type
		tenantReportLimit := setting.ReportSchedulerLicenseDefaultLimit
		if tenantType == "TRIAL" {
			tenantReportLimit = setting.ReportSchedulerTrialDefaultLimit
		}
		reportTenantDetails = &dtos.ReportTenantDetails{
			Type:  tenantType,
			Limit: tenantReportLimit,
		}
		if err = hs.setReportTenantDetails(ctx, orgId, *reportTenantDetails); err != nil {
			return err
		}
	}

	// Get report count for current user tenant
	if reportCount, err = hs.getReportCountByTenantId(ctx, orgId); err != nil {
		return err
	}

	// Compare report count with report tenant detail limit
	if *reportCount >= int64(reportTenantDetails.Limit) {
		return models.ErrReportTenantDetailsLimitReached
	}

	return nil
}
func (hs *HTTPServer) getEmailDomainRestrictions(c *models.ReqContext) ([]string, bool) {
	settings, err := hs.getReportSchedulerSettings(c)
	if err != nil {
		return []string{}, false
	}
	return settings.WhitelistedDomains, !settings.InternalDomainsOnly && len(settings.WhitelistedDomains) > 0
}
