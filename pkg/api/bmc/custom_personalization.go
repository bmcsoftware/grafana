package bmc

import (
	"context"
	plugin "github.com/grafana/grafana/pkg/api/bmc/custom_personalization"
	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/web"
	"net/http"
)

func (p *PluginsAPI) GetCustomPersonalization(c *models.ReqContext) response.Response {
	dashUID := web.Params(c.Req)[":uid"]
	if dashUID == "" {
		return response.Error(http.StatusBadRequest, "Bad request data", nil)
	}

	findDash := &models.GetDashboardQuery{
		Uid:   dashUID,
		OrgId: c.OrgID,
	}
	if err := p.dashSvc.GetDashboard(c.Req.Context(), findDash); err != nil {
		return response.Error(http.StatusNotFound, err.Error(), err)
	}

	query := &models.GetCustomDashPersonalization{
		OrgID:   c.OrgID,
		UserID:  c.UserID,
		DashUID: dashUID,
	}
	if err := p.store.GetDashPersonalization(c.Req.Context(), query); err != nil {
		return response.Error(http.StatusInternalServerError, "Failed to get personalized data", err)
	}

	return response.JSON(200, query.Result)
}

func (p *PluginsAPI) SaveCustomPersonalization(c *models.ReqContext) response.Response {
	cmd := plugin.CustomDashPersonalizationDTO{}

	dashUID := web.Params(c.Req)[":uid"]
	if dashUID == "" {
		return response.Error(http.StatusBadRequest, "Bad request data", nil)
	}

	findDash := &models.GetDashboardQuery{
		Uid:   dashUID,
		OrgId: c.OrgID,
	}
	if err := p.dashSvc.GetDashboard(c.Req.Context(), findDash); err != nil {
		return response.Error(http.StatusNotFound, err.Error(), err)
	}

	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "Bad request data", err)
	}

	query := &models.SaveCustomDashPersonalization{
		Data:    cmd.Data,
		OrgID:   c.OrgID,
		UserID:  c.UserID,
		DashUID: dashUID,
	}
	p.store.SaveDashPersonalization(c.Req.Context(), query)
	return response.JSON(200, query)
}

func (p *PluginsAPI) DeleteDashPersonalization(c *models.ReqContext) response.Response {
	dashUID := web.Params(c.Req)[":uid"]
	if dashUID == "" {
		return response.Error(http.StatusBadRequest, "Bad request data", nil)
	}

	query := &models.DeleteCustomDashPersonalization{
		OrgID:   c.OrgID,
		UserID:  c.UserID,
		DashUID: dashUID,
	}

	if err := p.store.DeleteDashPersonalization(c.Req.Context(), query); err != nil {
		return response.Error(http.StatusInternalServerError, "Failed to delete personalized data", err)
	}
	return response.Success("Personalized data deleted")
}

func SetupCustomPersonalization(sqlStore sqlstore.Store, ctx context.Context, dto *dtos.DashboardFullWithMeta, orgId, userId int64, uid string) {
	query := &models.GetCustomDashPersonalization{
		OrgID:   orgId,
		UserID:  userId,
		DashUID: uid,
	}
	if err := sqlStore.GetDashPersonalization(ctx, query); err == nil {
		if query.Result.Data == nil {
			return
		}

		if _, hasTimeFilter := query.Result.Data.CheckGet("time"); hasTimeFilter {
			dto.Dashboard.Set("time", query.Result.Data.Get("time"))
		}

		// List of new variables to add to the dashboard
		var newVariablesList []interface{}

		// List of existing default variables of dashboard
		defaultVariablesList := dto.Dashboard.GetPath("templating", "list").MustArray()

		// List of existing personalized variables of dashboard
		personalizedVariablesMap := query.Result.Data.MustMap()

		for _, defaultVariable := range defaultVariablesList {
			variableToUpdateMap := defaultVariable.(map[string]interface{})
			variableName := variableToUpdateMap["name"].(string)
			if personalizedVariablesMap["var-"+variableName] != nil {
				variableToUpdateMap["current"] = personalizedVariablesMap["var-"+variableName]
				newVariablesList = append(newVariablesList, variableToUpdateMap)
			} else {
				newVariablesList = append(newVariablesList, defaultVariable)
			}
		}
		dto.Dashboard.SetPath([]string{"templating", "list"}, newVariablesList)
	} else {
		plugin.Log.Error("Failed to set personalized data", "error", err)
	}
}
