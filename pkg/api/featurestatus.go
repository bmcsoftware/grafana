/*
 * Copyright (C) 2022 BMC Software Inc
 * Added by ymulthan at 4/12/2022
 */

package api

import (
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"net/http"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/web"
)

func (hs *HTTPServer) GetFeatureStatus(c *contextmodel.ReqContext) response.Response {
	query := &models.GetFeatureStatus{
		OrgId: c.OrgID,
	}
	if err := hs.sqlStore.GetFeatureStatus(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(query.Result)
}

func (hs *HTTPServer) AddFeatureStatus(c *contextmodel.ReqContext) response.Response {
	cmd := dtos.FeatureStatus{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := &models.SetFeatureStatus{
		OrgId: c.OrgID,
		Data: models.FeatureStatus{
			FeatureName: cmd.FeatureName,
			Status:      cmd.Status,
			OrgId:       cmd.OrgId,
			Id:          cmd.Id,
		},
	}

	if err := hs.sqlStore.SetFeatureStatus(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return response.Success("Configuration updated")
}
