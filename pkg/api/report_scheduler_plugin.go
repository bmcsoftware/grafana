package api

import (
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
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
