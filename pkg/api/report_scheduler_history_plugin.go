package api

import (
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/bmc"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

func (hs *HTTPServer) GetReportHistory(c *models.ReqContext) response.Response {
	id, err := util.ParamsInt64(web.Params(c.Req)[":id"])
	if err != nil {
		return hs.FailResponse(models.ErrInvalidId)
	}

	query := &bmc.GetReportHistory{
		OrgID:    c.OrgId,
		UserID:   c.UserId,
		ReportID: id,
		IsAdmin:  c.HasRole(models.ROLE_ADMIN),
	}
	if err := hs.SQLStore.GetReportHistory(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}

	return hs.SuccessResponse(query.Results)
}
