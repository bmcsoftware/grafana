/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by kmejdi at 29/7/2021
 */

package api

import (
	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
)

func GetCustomConfiguration(c *models.ReqContext) response.Response {
	query := &models.GetCustomConfiguration{
		OrgId: c.OrgId,
	}
	if err := bus.Dispatch(query); err != nil {
		return FailResponse(err)
	}
	result := dtos.CustomConfiguration{
		DocLink:       query.Result.DocLink,
		SupportLink:   query.Result.SupportLink,
		CommunityLink: query.Result.CommunityLink,
		VideoLink:     query.Result.VideoLink,
	}
	return SuccessResponse(result)
}
func AddCustomConfiguration(c *models.ReqContext, cmd dtos.CustomConfiguration) response.Response {
	query := &models.SetCustomConfiguration{
		OrgId: c.OrgId,
		Data: models.CustomConfiguration{
			DocLink:       cmd.DocLink,
			SupportLink:   cmd.SupportLink,
			CommunityLink: cmd.CommunityLink,
			VideoLink:     cmd.VideoLink,
		},
	}

	if err := bus.Dispatch(query); err != nil {
		return FailResponse(err)
	}
	return response.Success("Configuration updated")
}

func RefreshCustomConfiguration(c *models.ReqContext) response.Response {
	query := &models.RefreshCustomConfiguration{
		OrgId: c.OrgId,
	}
	if err := bus.Dispatch(query); err != nil {
		return FailResponse(err)
	}
	return response.Success("Configuration is set to default")
}
