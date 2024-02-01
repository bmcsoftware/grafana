/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by kmejdi at 29/7/2021
 */

package api

import (
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"net/http"
	"regexp"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/web"
)

func (hs *HTTPServer) GetCustomConfiguration(c *contextmodel.ReqContext) response.Response {
	query := &models.GetCustomConfiguration{
		OrgId: c.OrgID,
	}
	if err := hs.sqlStore.GetCustomConfiguration(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	result := dtos.CustomConfiguration{
		DocLink:       query.Result.DocLink,
		SupportLink:   query.Result.SupportLink,
		CommunityLink: query.Result.CommunityLink,
		VideoLink:     query.Result.VideoLink,
	}
	return hs.SuccessResponse(result)
}
func (hs *HTTPServer) AddCustomConfiguration(c *contextmodel.ReqContext) response.Response {
	cmd := dtos.CustomConfiguration{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	if !ValidateLink(cmd.DocLink) || !ValidateLink(cmd.SupportLink) || !ValidateLink(cmd.CommunityLink) || !ValidateLink(cmd.VideoLink) {
		return response.Error(http.StatusBadRequest, "Invalid Url", nil)
	}
	query := &models.SetCustomConfiguration{
		OrgId: c.OrgID,
		Data: models.CustomConfiguration{
			DocLink:       cmd.DocLink,
			SupportLink:   cmd.SupportLink,
			CommunityLink: cmd.CommunityLink,
			VideoLink:     cmd.VideoLink,
		},
	}

	if err := hs.sqlStore.SetCustomConfiguration(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return response.Success("Configuration updated")
}

func ValidateLink(url string) bool {
	if len(url) == 0 {
		return true
	}
	re := regexp.MustCompile(`^(http|https):\/\/[^ "]+$`)
	return re.MatchString(url)
}

func (hs *HTTPServer) RefreshCustomConfiguration(c *contextmodel.ReqContext) response.Response {
	query := &models.RefreshCustomConfiguration{
		OrgId: c.OrgID,
	}
	if err := hs.sqlStore.ResetCustomConfiguration(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return response.Success("Configuration is set to default")
}
