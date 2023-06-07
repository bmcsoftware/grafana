package api

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"

	utils "github.com/grafana/grafana/pkg/api/bmc"
	"github.com/grafana/grafana/pkg/api/bmc/external"
	"net/http"
	"os"
	"time"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/bmc"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

func (hs *HTTPServer) GetAllReports(ctx *models.ReqContext) response.Response {
	query := &bmc.GetAllReports{
		QueryName: ctx.Query("query"),
		Auth: bmc.Auth{
			UserID:      ctx.UserID,
			OrgID:       ctx.OrgID,
			IsOrgAdmin:  ctx.OrgRole == org.RoleAdmin,
			IsSuperUser: ctx.IsGrafanaAdmin,
		},
	}

	if err := hs.SQLStore.GetAllReports(ctx.Req.Context(), query); err != nil {
		return response.Error(500, "Failed to fetch reports", err)
	}

	reports := make([]bmc.ReportsResponse, 0)
	for _, report := range query.Result {
		reports = append(reports, bmc.ReportModelToDTO(report))
	}

	return response.JSON(200, reports)
}

func (hs *HTTPServer) GetReportByID(ctx *models.ReqContext) response.Response {
	id, _ := util.ParamsInt64(web.Params(ctx.Req)[":id"])
	query := &bmc.GetReportByID{
		ID: id,
		Auth: bmc.Auth{
			UserID:      ctx.UserID,
			OrgID:       ctx.OrgID,
			IsOrgAdmin:  ctx.OrgRole == org.RoleAdmin,
			IsSuperUser: ctx.IsGrafanaAdmin,
		},
	}

	if err := hs.SQLStore.GetReportByID(ctx.Req.Context(), query); err != nil {
		return response.JSON(500, err)
	}

	report := bmc.ReportModelToDTO(query.Result)

	return response.JSON(200, report)
}

func (hs *HTTPServer) CreateReport(ctx *models.ReqContext) response.Response {
	payload := bmc.CreateReport{}
	if err := web.Bind(ctx.Req, &payload); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	if err := hs.checkReportLimitReached(ctx.Req.Context(), ctx.OrgID); err != nil {
		return hs.FailResponse(err)
	}

	if payload.ScheduleType != "ftp" {
		if len(payload.Recipients) == 0 {
			return response.Error(400, "Recipients are required", nil)
		}

		settings, err := hs.getReportSchedulerSettings(ctx)
		if err == nil {
			isInternalDomain := settings.InternalDomainsOnly
			hasWhitelistedDomains := len(settings.WhitelistedDomains) > 0
			if isInternalDomain {
				validRecipients, err := external.FilterInternalUsersByEmails(ctx, payload.Recipients)
				if err != nil {
					return response.Error(http.StatusBadRequest, "Domain restriction failed", err)
				}
				if len(validRecipients) != len(payload.Recipients) {
					return response.Error(http.StatusPreconditionFailed, "Some recipients are not internal users", err)
				}
				payload.Recipients = validRecipients
			} else if hasWhitelistedDomains {
				// check if recipients are in whitelist
				validRecipients := util.EmailDomainValidator(payload.Recipients, settings.WhitelistedDomains)
				if len(payload.Recipients) != len(validRecipients) {
					return response.Error(http.StatusPreconditionFailed, "Some recipients are not in whitelist", err)
				}
			}
		}
		if err != nil {
			hs.log.Warn("Failed to get report scheduler settings", "error", err)
		}
	}

	payload.Name = util.SanitizeHtml(payload.Name)
	payload.Description = util.SanitizeHtml(payload.Description)
	payload.Subject = util.SanitizeHtml(payload.Subject)
	payload.Message = util.SanitizeHtml(payload.Message)

	nextAt, err := util.GetNextAt(payload.Cron, payload.Timezone)
	if err != nil {
		return response.Error(http.StatusBadRequest, "Invalid cron expression", err)
	}

	report := &models.InsertRS{
		Data: models.InsertRSData{
			Name:         payload.Name,
			Description:  payload.Description,
			DashboardId:  payload.DashboardId,
			TimeRange:    payload.TimeRange,
			TimeRangeTo:  payload.TimeRangeTo,
			Filter:       payload.Filter,
			ReplyTo:      payload.ReplyTo,
			Subject:      payload.Subject,
			Recipients:   util.JoinStr(payload.Recipients),
			Message:      payload.Message,
			Orientation:  payload.Orientation,
			Layout:       payload.Layout,
			Enabled:      payload.Enabled,
			CreatedAt:    time.Now().UTC(),
			UpdatedAt:    time.Now().UTC(),
			NextAt:       nextAt.Unix(),
			ReportType:   payload.ReportType,
			ScheduleType: payload.ScheduleType,
			ServerDir:    payload.ServerDir,
			HasDateStamp: payload.HasDateStamp,
			HasTimeStamp: payload.HasTimeStamp,
			UserId:       ctx.UserID,
			OrgId:        ctx.OrgID,
		},
		Scheduler: models.InsertRScheduler{
			Timezone: payload.Timezone,
			Cron:     payload.Cron,
		},
	}

	if err != nil {
		return hs.FailResponse(err)
	}
	query := report

	if err := hs.SQLStore.InsertRS(ctx.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}

	return hs.SuccessResponse(CustomResponse{Id: query.Data.Id, Message: Created})
}

func (hs *HTTPServer) UpdateReport(ctx *models.ReqContext) response.Response {
	payload := bmc.UpdateReport{}
	if err := web.Bind(ctx.Req, &payload); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	if payload.Id == 0 {
		payload.Id, _ = util.ParamsInt64(web.Params(ctx.Req)[":id"])
	}
	if payload.Id == 0 {
		return response.Error(http.StatusBadRequest, "Invalid report id", nil)
	}

	if payload.ScheduleType != "ftp" {
		if len(payload.Recipients) == 0 {
			return response.Error(400, "Recipients are required", nil)
		}

		settings, err := hs.getReportSchedulerSettings(ctx)
		if err == nil {
			isInternalDomain := settings.InternalDomainsOnly
			hasWhitelistedDomains := len(settings.WhitelistedDomains) > 0
			if isInternalDomain {
				validRecipients, err := external.FilterInternalUsersByEmails(ctx, payload.Recipients)
				if err != nil {
					return response.Error(http.StatusBadRequest, "Restriction of internal domains only failed", err)
				}
				if len(validRecipients) != len(payload.Recipients) {
					return response.Error(http.StatusPreconditionFailed, "Some recipients are not internal users", err)
				}
				payload.Recipients = validRecipients
			} else if hasWhitelistedDomains {
				// check if recipients are in whitelist
				validRecipients := util.EmailDomainValidator(payload.Recipients, settings.WhitelistedDomains)
				if len(payload.Recipients) != len(validRecipients) {
					return response.Error(http.StatusPreconditionFailed, "Some recipients are not in whitelist", err)
				}
			}
		}
		if err != nil {
			hs.log.Warn("Failed to get report scheduler settings", "error", err)
		}
	}

	nextAt, err := util.GetNextAt(payload.Cron, payload.Timezone)
	if err != nil {
		return response.Error(http.StatusBadRequest, "Invalid cron expression", err)
	}

	report := &models.UpdateRS{
		Data: models.UpdateRSData{
			Id:           payload.Id,
			OrgId:        ctx.OrgID,
			Name:         util.SanitizeHtml(payload.Name),
			Description:  util.SanitizeHtml(payload.Description),
			DashboardId:  payload.DashboardId,
			TimeRange:    payload.TimeRange,
			TimeRangeTo:  payload.TimeRangeTo,
			Filter:       payload.Filter,
			ReplyTo:      payload.ReplyTo,
			Subject:      util.SanitizeHtml(payload.Subject),
			Recipients:   util.JoinStr(payload.Recipients),
			Message:      util.SanitizeHtml(payload.Message),
			Orientation:  payload.Orientation,
			Layout:       payload.Layout,
			Enabled:      payload.Enabled,
			UpdatedAt:    time.Now().UTC(),
			NextAt:       nextAt.Unix(),
			ReportType:   payload.ReportType,
			ScheduleType: payload.ScheduleType,
			ServerDir:    payload.ServerDir,
			HasDateStamp: payload.HasDateStamp,
			HasTimeStamp: payload.HasTimeStamp,
		},
		UserId: ctx.UserID,
		Scheduler: models.InsertRScheduler{
			StartFrom: payload.StartFrom,
			EndAt:     payload.EndAt,
			Timezone:  payload.Timezone,
			Cron:      payload.Cron,
		},
		IsOrgAdmin: ctx.OrgRole == org.RoleAdmin,
	}
	if err != nil {
		return hs.FailResponse(err)
	}

	query := report

	if err := hs.SQLStore.UpdateRS(ctx.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}

	logger.Info("Report Update", "Report_ID", query.Data.Id, "Report_Name", query.Data.Name, "Org_ID", ctx.OrgID, "Updated_by", ctx.UserID)
	return hs.SuccessResponse(CustomResponse{Id: query.Data.Id, Message: Updated})
}

func (hs *HTTPServer) DeleteReport(ctx *models.ReqContext) response.Response {
	paramsIds := ctx.QueryStrings("id")
	ids := utils.StrToInt64s(paramsIds)
	if len(ids) == 0 {
		return response.Error(http.StatusBadRequest, "No reports to delete", nil)
	}

	query := models.DeleteRS{Ids: ids, UserId: ctx.UserID, OrgId: ctx.OrgID, IsOrgAdmin: ctx.OrgRole == org.RoleAdmin}
	if err := hs.SQLStore.DeleteRS(ctx.Req.Context(), &query); err != nil {
		return hs.FailResponse(err)
	}

	message := DeletedOne
	if len(ids) > 1 {
		message = DeletedMany
	}
	return response.Success(message)
}

func (hs *HTTPServer) GetReportJobByID(ctx *models.ReqContext) response.Response {
	jobID, err := util.ParamsInt64(web.Params(ctx.Req)[":id"])
	if err != nil {
		return response.Error(400, "Invalid job id", err)
	}
	query := &bmc.GetReportJobQueue{
		JobID: jobID,
		OrgID: ctx.OrgID,
	}
	hs.log.Info("GetReportJobByID", "jobID", query.JobID, "orgID", query.OrgID)
	if err := hs.SQLStore.GetReportJobQueue(ctx.Req.Context(), query); err != nil {
		return response.Error(500, err.Error(), err)
	}

	if query.Result.FileKey == "" {
		return response.Error(http.StatusNotFound, "Report is not in storage", err)
	}

	storageBucketName := os.Getenv("AWS_BUCKET_NAME")
	accessKeyID := os.Getenv("AWS_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	endpoint := os.Getenv("AWS_ENDPOINT")
	region := os.Getenv("AWS_REGION")

	client, err := session.NewSession(&aws.Config{
		Credentials: credentials.NewStaticCredentialsFromCreds(credentials.Value{
			AccessKeyID:     accessKeyID,
			SecretAccessKey: secretAccessKey,
		}),
		Endpoint:         aws.String(endpoint),
		Region:           aws.String(region),
		S3ForcePathStyle: aws.Bool(true),
	})
	if err != nil {
		return hs.FailResponse(err)
	}

	svc := s3.New(client)

	// check if file with version exist
	hs.log.Info("Checking if file with version exists")
	if _, err := svc.HeadObject(&s3.HeadObjectInput{
		Bucket:    aws.String(storageBucketName),
		VersionId: aws.String(query.Result.FileVersion),
		Key:       aws.String(query.Result.FileKey),
	}); err != nil {
		hs.log.Info("File with version does not exist", "error", err)
		return response.Error(404, "File is not available on storage", err)
	}

	req, _ := svc.GetObjectRequest(&s3.GetObjectInput{
		Bucket:    aws.String(storageBucketName),
		VersionId: aws.String(query.Result.FileVersion),
		Key:       aws.String(query.Result.FileKey),
	})

	preSignedURL, err := req.Presign(1 * time.Minute)

	return response.Success(preSignedURL)
}
