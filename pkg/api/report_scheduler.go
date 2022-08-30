package api

import (
	"context"
	"errors"
	"fmt"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"
	"net/http"
	"time"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/components/simplejson"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
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
func GetRS(c *models.ReqContext) response.Response {
	query := &models.GetAll{
		UserId:      c.UserId,
		OrgId:       c.OrgId,
		QueryName:   c.Query("query"),
		QueryDashId: c.QueryInt64("folderId"),
	}
	data, err := SelectAll(c.Req.Context(), query)
	if err != nil {
		return FailResponse(err)
	}

	result := make([]*dtos.RSData, 0)
	for _, report := range data {
		result = append(result, reportToJson(report))
	}
	return SuccessResponse(result)
}
func GetRSById(c *models.ReqContext) response.Response {
	id := c.ParamsInt64(":id")
	query := &models.GetById{
		UserId: c.UserId,
		OrgId:  c.OrgId,
		Id:     id,
	}
	data, err := SelectById(c.Req.Context(), query)
	if err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(reportToJson(data))
}
func GetRSByDashIds(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	if len(cmd.Ids) == 0 {
		return GetRS(c)
	}
	query := &models.GetByDashIds{
		UserId:  c.UserId,
		OrgId:   c.OrgId,
		DashIds: cmd.Ids,
	}
	data, err := SelectByDashIds(c.Req.Context(), query)
	if err != nil {
		return FailResponse(err)
	}
	result := make([]*dtos.RSData, 0)
	for _, report := range data {
		result = append(result, reportToJson(report))
	}
	return SuccessResponse(result)
}

func InsertRS(c *models.ReqContext) response.Response {
	cmd := dtos.InsertRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	if err := checkReportLimitReached(c.Req.Context(), c.OrgId); err != nil {
		return FailResponse(err)
	}

	report, err := jsonToInsertReport(&cmd)
	if err != nil {
		return FailResponse(err)
	}
	query := report
	query.Data.UserId = c.UserId
	query.Data.OrgId = c.OrgId
	query.Data.CreatedAt = time.Now().UTC()
	query.Data.UpdatedAt = time.Now().UTC()

	if err := bus.DispatchCtx(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}

	return SuccessResponse(CustomResponse{Id: query.Data.Id, Message: Created})
}
func UpdateRS(c *models.ReqContext) response.Response {
	cmd := dtos.UpdateRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	//settings, _ := getReportSchedulerSettings(c.OrgId)
	// If only internal domains is set to false
	// And if the whitelisted domains is not empty then validate emails
	// If whitelisted domains is empty then accept all domains.
	//if !settings.InternalDomainsOnly {
	//if len(settings.WhitelistedDomains) > 0 {
	//	cmd.Recipients = util.EmailDomainValidator(cmd.Recipients, settings.WhitelistedDomains)
	//}
	//} else {
	// If only internal domains is set to true
	// then this validation will only be done in UI
	// since we don't have the tenant domain that
	// we need to validate.
	//}

	report, err := jsonToUpdateReport(&cmd)
	if err != nil {
		return FailResponse(err)
	}

	query := report
	query.Data.UserId = c.UserId
	query.Data.OrgId = c.OrgId
	query.Data.UpdatedAt = time.Now().UTC()

	if err := bus.DispatchCtx(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}

	return SuccessResponse(CustomResponse{Id: query.Data.Id, Message: Updated})
}
func DeleteRS(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := models.DeleteRS{Ids: cmd.Ids, UserId: c.UserId, OrgId: c.OrgId}
	if err := bus.DispatchCtx(c.Req.Context(), &query); err != nil {
		return FailResponse(err)
	}

	message := DeletedOne
	if len(cmd.Ids) > 1 {
		message = DeletedMany
	}
	return SuccessResponse(CustomResponse{Ids: cmd.Ids, Message: message})
}

func DeleteRSByDashIds(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := models.DeleteRSByDashIds{Ids: cmd.Ids, UserId: c.UserId, OrgId: c.OrgId}
	if err := bus.DispatchCtx(c.Req.Context(), &query); err != nil {
		return FailResponse(err)
	}
	message := DeletedOne
	if len(cmd.Ids) > 1 {
		message = DeletedMany
	}
	return SuccessResponse(CustomResponse{Ids: cmd.Ids, Message: message})
}

func EnableRS(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := models.EnableRS{Ids: cmd.Ids, UserId: c.UserId, OrgId: c.OrgId}
	if err := bus.DispatchCtx(c.Req.Context(), &query); err != nil {
		return FailResponse(err)
	}
	message := EnableOne
	if len(cmd.Ids) > 1 {
		message = EnableMany
	}
	return SuccessResponse(CustomResponse{Ids: cmd.Ids, Message: message})
}
func DisableRS(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := models.DisableRS{Ids: cmd.Ids, UserId: c.UserId, OrgId: c.OrgId}
	if err := bus.DispatchCtx(c.Req.Context(), &query); err != nil {
		return FailResponse(err)
	}

	message := DisableOne
	if len(cmd.Ids) > 1 {
		message = DisableMany
	}
	return SuccessResponse(CustomResponse{Ids: cmd.Ids, Message: message})
}

func ReportPDFPreview(c *models.ReqContext) response.Response {
	cmd := dtos.RSDataPreview{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	cmd.Name = util.SanitizeHtml(cmd.Name)
	cmd.Description = util.SanitizeHtml(cmd.Description)

	cmd.OrgId = c.OrgId
	cmd.UserId = c.UserId

	body, status, err := rs.PreviewPDF(cmd)
	if err != nil {
		return response.Error(status, err.Error(), err)
	}

	headers := make(http.Header)
	headers.Set("Content-Type", "application/pdf")
	return response.CreateNormalResponse(headers, body, 200)
}

func ReportSendMail(c *models.ReqContext) response.Response {
	cmd := dtos.RSDataSendMail{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	// Sanitize fields
	cmd.Name = util.SanitizeHtml(cmd.Name)
	cmd.Description = util.SanitizeHtml(cmd.Description)
	cmd.Subject = util.SanitizeHtml(cmd.Subject)
	cmd.Message = util.SanitizeHtml(cmd.Message)

	cmd.UserId = c.UserId
	cmd.OrgId = c.OrgId

	body, err := rs.PreviewMail(cmd)
	if err != nil {
		return response.Error(500, err.Error(), err)
	}

	headers := make(http.Header)
	headers.Set("Content-Type", "application/json")
	return response.CreateNormalResponse(headers, body, 200)
}

func ReportExecuteOnce(c *models.ReqContext) response.Response {
	cmd := dtos.ListRS{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	if len(cmd.Ids) == 0 {
		return response.Error(400, "ID is not specified", nil)
	}

	query := &models.GetJobById{
		Id:     cmd.Ids[0],
		UserId: c.UserId,
		OrgId:  c.OrgId,
	}
	result, err := SelectJobById(c.Req.Context(), query)
	if err != nil {
		return response.Error(500, err.Error(), err)
	}

	recipients := util.SplitStr(result.Recipients)
	payload := dtos.RSDataExecute{
		RSDataSendMail: dtos.RSDataSendMail{
			RSDataPreview: dtos.RSDataPreview{
				Id:          result.Id,
				UserId:      c.UserId,
				OrgId:       c.OrgId,
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
		DashName: result.DashName,
	}

	body, err := rs.ExecuteOnce(payload)
	if err != nil {
		return response.Error(500, err.Error(), err)
	}

	headers := make(http.Header)
	headers.Set("Content-Type", "application/json")
	return response.CreateNormalResponse(headers, body, 200)
}

func GetTenantUsers(c *models.ReqContext) response.Response {
	result := getTenantUsers(c.Req.Context(), c.OrgId, c.Query("query"), c.QueryInt("limit"))
	return response.JSON(200, result)
}

// -------------- Queries Dispatchers to SQLStore -------------- //
func SelectAll(ctx context.Context, query *models.GetAll) ([]*models.RSData, error) {
	if err := bus.DispatchCtx(ctx, query); err != nil {
		return nil, err
	}
	return query.Result, nil
}
func SelectById(ctx context.Context, query *models.GetById) (*models.RSData, error) {
	if err := bus.DispatchCtx(ctx, query); err != nil {
		return nil, err
	}
	return query.Result, nil
}

func SelectByDashIds(ctx context.Context, query *models.GetByDashIds) ([]*models.RSData, error) {
	if err := bus.DispatchCtx(ctx, query); err != nil {
		return nil, err
	}
	return query.Result, nil
}

func SelectJobById(ctx context.Context, query *models.GetJobById) (*models.ExecuteRS, error) {
	if err := bus.DispatchCtx(ctx, query); err != nil {
		return nil, err
	}
	return query.Result, nil
}

func InsertRSJobQueue(c *models.ReqContext) response.Response {
	cmd := dtos.RSJobQueue{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := &models.InsertRSJobQueue{
		ElapsedTime: 0,
		StartedAt:   cmd.StartedAt,
		ReportId:    cmd.ReportId,
	}
	if err := bus.DispatchCtx(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(CustomResponse{Id: query.Id})
}
func UpdateRSJobQueue(c *models.ReqContext) response.Response {
	cmd := dtos.RSJobQueue{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := &models.UpdateRSJobQueue{
		Id:          cmd.Id,
		ElapsedTime: cmd.ElapsedTime,
		FinishedAt:  cmd.FinishedAt,
	}
	if err := bus.DispatchCtx(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(CustomResponse{})
}
func InsertRSJobStatus(c *models.ReqContext) response.Response {
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
	if err := bus.DispatchCtx(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(CustomResponse{})
}

func RemoveOrDisableOrgSchedules(c *models.ReqContext) response.Response {

	orgId := c.ParamsInt64(":orgId")
	isOffboarded, err := util.ParamsBool(c.Req, ":isOffboarded")
	if err != nil {
		return FailResponse(err)
	}
	query := &models.RemoveOrDisableOrgSchedules{
		OrgId:        orgId,
		IsOffboarded: isOffboarded,
	}

	if err := bus.DispatchCtx(c.Req.Context(), query); err != nil {
		if isOffboarded {
			return response.Error(500, "Failed to delete report schedules for the org.", err)
		} else {
			return response.Error(500, "Failed to disable report schedules for the org.", err)
		}
	}
	return response.JSON(200, "Report schedules deleted/disabled successfully.")
}

// -------------- Model to Json -------------- //
func reportToJson(report *models.RSData) *dtos.RSData {

	recipients := util.SplitStr(report.Recipients)

	CreatedAt := report.CreatedAt.UTC().Unix()
	UpdatedAt := report.UpdatedAt.UTC().Unix()
	NextAt := report.NextAt.Int64
	LastAt := report.LastAt.Int64

	info := &dtos.RSInfo{
		UserId:    report.UserId,
		CreatedAt: CreatedAt,
		UpdatedAt: UpdatedAt,
		NextAt:    NextAt,
		LastAt:    LastAt,
		Status:    OK,
	}

	json := &dtos.RSData{
		Id:          report.Id,
		Name:        report.Name,
		Description: report.Description,
		DashboardId: report.DashboardId,
		TimeRange:   report.TimeRange,
		Filter:      report.Filter,
		Subject:     report.Subject,
		Recipients:  recipients,
		ReplyTo:     report.ReplyTo,
		Message:     report.Message,
		Orientation: report.Orientation,
		Layout:      report.Layout,
		Enabled:     report.Enabled,
		Cron:        report.Cron,
		Timezone:    report.Timezone,
		StartFrom:   report.StartFrom,
		EndAt:       report.EndAt,
		RSInfo:      info,
		ReportType:  report.ReportType,
	}

	return json
}
func jsonToInsertReport(json *dtos.InsertRS) (*models.InsertRS, error) {
	// Sanitize fields
	json.Name = util.SanitizeHtml(json.Name)
	json.Description = util.SanitizeHtml(json.Description)
	json.Subject = util.SanitizeHtml(json.Subject)
	json.Message = util.SanitizeHtml(json.Message)

	nextAt, err := util.GetNextAt(json.Cron, json.Timezone)
	if err != nil {
		return nil, err
	}

	report := &models.InsertRS{
		Data: models.InsertRSData{
			Name:        json.Name,
			Description: json.Description,
			DashboardId: json.DashboardId,
			TimeRange:   json.TimeRange,
			Filter:      json.Filter,
			ReplyTo:     json.ReplyTo,
			Subject:     json.Subject,
			Recipients:  util.JoinStr(json.Recipients),
			Message:     json.Message,
			Orientation: json.Orientation,
			Layout:      json.Layout,
			Enabled:     json.Enabled,
			CreatedAt:   time.Time{},
			UpdatedAt:   time.Time{},
			NextAt:      nextAt.Unix(),
			ReportType:  json.ReportType,
		},
		Scheduler: models.InsertRScheduler{
			Timezone: json.Timezone,
			Cron:     json.Cron,
		},
	}

	return report, nil
}
func jsonToUpdateReport(json *dtos.UpdateRS) (*models.UpdateRS, error) {
	// Sanitize fields
	json.Name = util.SanitizeHtml(json.Name)
	json.Description = util.SanitizeHtml(json.Description)
	json.Subject = util.SanitizeHtml(json.Subject)
	json.Message = util.SanitizeHtml(json.Message)

	nextAt, err := util.GetNextAt(json.Cron, json.Timezone)
	if err != nil {
		return nil, err
	}

	report := &models.UpdateRS{
		Data: models.InsertRSData{
			Id:          json.Id,
			Name:        json.Name,
			Description: json.Description,
			DashboardId: json.DashboardId,
			TimeRange:   json.TimeRange,
			Filter:      json.Filter,
			ReplyTo:     json.ReplyTo,
			Subject:     json.Subject,
			Recipients:  util.JoinStr(json.Recipients),
			Message:     json.Message,
			Orientation: json.Orientation,
			Layout:      json.Layout,
			Enabled:     json.Enabled,
			NextAt:      nextAt.Unix(),
			ReportType:  json.ReportType,
		},
		Scheduler: models.InsertRScheduler{
			StartFrom: json.StartFrom,
			EndAt:     json.EndAt,
			Timezone:  json.Timezone,
			Cron:      json.Cron,
		},
	}

	return report, nil
}

type CustomResponse struct {
	Id      int64   `json:"id,omitempty"`
	Ids     []int64 `json:"ids,omitempty"`
	Message string  `json:"message,omitempty"`
}

func SuccessResponse(res interface{}) response.Response {
	return response.JSON(200, res)
}
func FailResponse(err error) response.Response {
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

func GetReportTenantDetails(c *models.ReqContext) response.Response {
	result, err := getReportTenant(c.Req.Context(), c.OrgId)
	if err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(result)
}

func CreateOrUpdateReportTenantDetails(c *models.ReqContext) response.Response {
	cmd := dtos.ReportTenantDetails{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	if err := setReportTenantDetails(c.Req.Context(), c.OrgId, cmd); err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(CustomResponse{Message: "Updated."})
}

func DeleteReportTenantDetails(c *models.ReqContext) response.Response {
	query := models.DeleteReportTenantDetails{
		OrgId: c.OrgId,
	}
	if err := bus.DispatchCtx(c.Req.Context(), &query); err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(CustomResponse{Message: "Deleted."})
}

func getReportTenant(ctx context.Context, orgId int64) (*dtos.ReportTenantDetails, error) {
	query := models.GetReportTenantDetails{OrgId: orgId}
	if err := bus.DispatchCtx(ctx, &query); err != nil {
		return nil, err
	}
	return &dtos.ReportTenantDetails{
		Type:  query.Result.Type,
		Limit: query.Result.Limit,
	}, nil
}
func getReportCountByTenantId(ctx context.Context, orgId int64) (*int64, error) {
	query := models.GetCountReportByTenant{OrgId: orgId}
	if err := bus.DispatchCtx(ctx, &query); err != nil {
		return nil, err
	}
	return query.Result, nil
}
func setReportTenantDetails(ctx context.Context, orgId int64, reportDetails dtos.ReportTenantDetails) error {
	query := models.CreateOrUpdateReportTenantDetails{
		OrgId: orgId,
		ReportTenantDetails: models.ReportTenantDetails{
			Type:  reportDetails.Type,
			Limit: reportDetails.Limit,
		},
	}
	return bus.DispatchCtx(ctx, &query)
}
func checkReportLimitReached(ctx context.Context, orgId int64) error {
	var err error
	var reportCount *int64
	tenantDetails := &dtos.TenantDetails{}
	reportTenantDetails := &dtos.ReportTenantDetails{}

	// Get tenant details
	if reportTenantDetails, err = getReportTenant(ctx, orgId); err != nil {

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
		if err = setReportTenantDetails(ctx, orgId, *reportTenantDetails); err != nil {
			return err
		}
	}

	// Get report count for current user tenant
	if reportCount, err = getReportCountByTenantId(ctx, orgId); err != nil {
		return err
	}

	// Compare report count with report tenant detail limit
	if *reportCount >= int64(reportTenantDetails.Limit) {
		return models.ErrReportTenantDetailsLimitReached
	}

	return nil
}
