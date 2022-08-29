/*
 * Copyright (C) 2022 BMC Software Inc
 * Added by ymulthan at 4/12/2022
 */

package api

import (
	"net/http"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/web"
)

func GetFeatureStatus(c *models.ReqContext) response.Response {
	query := &models.GetFeatureStatus{
		OrgId: c.OrgId,
	}
	if err := bus.Dispatch(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(query.Result)
}

func AddFeatureStatus(c *models.ReqContext) response.Response {
	cmd := dtos.FeatureStatus{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	query := &models.SetFeatureStatus{
		OrgId: c.OrgId,
		Data: models.FeatureStatus{
			FeatureName: cmd.FeatureName,
			Status:      cmd.Status,
			OrgId:       cmd.OrgId,
			Id:          cmd.Id,
		},
	}

	if err := bus.Dispatch(c.Req.Context(), query); err != nil {
		return FailResponse(err)
	}
	return response.Success("Configuration updated")
}
