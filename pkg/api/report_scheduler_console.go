package api

import (
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"
)

func GetReportListJobQueue(c *models.ReqContext) response.Response {
	q := c.Query("query")
	query := &models.GetReportListJobQueue{
		Query: q,
		OrgID: c.OrgId,
	}
	if err := bus.Dispatch(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}

	return SuccessResponse(query.Result)
}

func GetRSJobQueueByJobId(c *models.ReqContext) response.Response {
	id, err := util.ParamsInt64(c.Req, ":id")
	if err != nil {
		return FailResponse(models.ErrInvalidId)
	}

	query := &models.GetRSJobQueueByJobId{
		OrgID: c.OrgId,
		JobId: id,
	}
	if err := bus.Dispatch(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}

	return SuccessResponse(query.Result)
}
func GetJobQueuesByReportId(c *models.ReqContext) response.Response {
	id, err := util.ParamsInt64(c.Req, ":id")
	if err != nil {
		return FailResponse(models.ErrInvalidId)
	}

	order := c.Query("order")
	if order != "asc" && order != "desc" {
		order = "asc"
	}

	query := &models.GetRSJobQueues{
		OrgID:      c.OrgId,
		UserID:     c.UserId,
		ReportId:   id,
		Limit:      10,
		Order:      order,
		IsOrgAdmin: c.HasRole(models.ROLE_ADMIN),
	}
	if err := bus.Dispatch(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}

	return SuccessResponse(query.Result)
}
