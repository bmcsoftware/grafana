/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by ateli at 10/02/2022
 */

package api

import (
	"errors"
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

func GetAllCalcFields(c *models.ReqContext) response.Response {
	//DRJ71-3531 - Permission check for Editor or Admin
	if c.OrgRole == "Viewer"{
		return response.Error(403, "Unauthorized: User do not have permission to perform this action", nil)
	}
	
	query := models.GetCalculatedFields{
		OrgId: c.OrgId,
	}

	if err := sqlstore.GetCalculatedFields(c.Req.Context(), &query); err != nil {
		return response.Error(500, "Failed to get Calculated Fields", err)
	}
	return response.JSON(200, query.Result)
}

func CreateNewCalcFields(c *models.ReqContext) response.Response {
	cmd := models.CreateCalcFieldCmd{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request payload", err)
	}

	//DRJ71-3531 - Permission check for Editor or Admin
	if c.OrgRole == "Viewer"{
		return response.Error(403, "Unauthorized: User do not have permission to perform this action", nil)
	}
	cmd.OrgId = c.OrgId
	if err := sqlstore.CheckForField(cmd.Name); err != nil {
		if errors.Is(err, models.DuplicateFieldName) {
			return response.Error(409, "Calculated field name is already taken. Please provide a different name.", err)
		}
		return response.Error(500, "Failed to create calculated field", err)
	}
	if err := sqlstore.CreateCalculatedField(c.Req.Context(), &cmd); err != nil {
		return response.Error(500, "Failed to create calculated field", err)
	}
	return response.JSON(200, &util.DynMap{"message": "New Field Created Successfully"})
}

func DeleteCalcFieldsById(c *models.ReqContext) response.Response {
	cmd := models.DeleteCalcFieldsByIds{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request payload", err)
	}

	//DRJ71-3531 - Permission check for Editor or Admin
	if c.OrgRole == "Viewer"{
		return response.Error(403, "Unauthorized: User do not have permission to perform this action", nil)
	}
	cmd.OrgId = c.OrgId
	if err := sqlstore.DeletelatedFields(c.Req.Context(), &cmd); err != nil {
		return response.Error(500, "Failed to delete calculated field", err)
	}
	return response.Success("Fields Deleted Successfully")
}
