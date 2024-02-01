package api

import (
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

func (hs *HTTPServer) GetReportListJobQueue(c *models.ReqContext) response.Response {
	q := c.Query("query")
	query := &models.GetReportListJobQueue{
		Query: q,
		OrgID: c.OrgID,
	}
	if err := hs.SQLStore.GetReportListJobQueue(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}

	return hs.SuccessResponse(query.Result)
}

func (hs *HTTPServer) GetRSJobQueueByJobId(c *models.ReqContext) response.Response {
	id, err := util.ParamsInt64(web.Params(c.Req)[":id"])
	if err != nil {
		return hs.FailResponse(models.ErrInvalidId)
	}

	query := &models.GetRSJobQueueByJobId{
		OrgID: c.OrgID,
		JobId: id,
	}
	if err := hs.SQLStore.GetRSJobQueueByJobId(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}

	return hs.SuccessResponse(query.Result)
}
