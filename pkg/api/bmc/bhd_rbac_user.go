package bmc

import (
	"net/http"
	"strconv"

	logger "github.com/grafana/grafana/pkg/api/bmc/bhd_rbac"
	"github.com/grafana/grafana/pkg/api/bmc/bhd_rbac/user"
	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/web"
)

func (p *PluginsAPI) SearchUser(c *contextmodel.ReqContext) response.Response {
	perPage := c.QueryInt("perpage")
	if perPage <= 0 {
		perPage = 1000
	}
	page := c.QueryInt("page")

	if page < 1 {
		page = 1
	}

	//Dashboard Role Id Validation
	roleIdStr := c.Query("bhdRoleId")
	if roleIdStr != "" {
		validationResponse := p.ValidateDashboardRoleId(c, roleIdStr)
		if validationResponse != nil {
			return validationResponse
		}
	}

	request := user.SearchUsersQuery{
		OrgID:     c.OrgID,
		Query:     c.Query("query"),
		Name:      c.Query("name"),
		BHDRoleID: c.QueryInt64("bhdRoleId"),
		OrderBy:   c.Query("sortby"),
		Selected:  c.QueryBool("selected"),
		Page:      page,
		Limit:     perPage,
	}
	logger.Log.Info("User search request", "request", request)
	result, err := user.SearchUsers(c.Req.Context(), p.store, &request)
	if err != nil {
		logger.Log.Error("Failed to search Users", "error", err)
		return response.Error(500, "Failed to search Users", err)
	}
	result.Page = page
	result.PerPage = perPage
	logger.Log.Info("User search request processed successfully", "Total Count", result.TotalCount)
	return response.JSON(http.StatusOK, result)
}

func (p *PluginsAPI) AddUserBHDRole(c *contextmodel.ReqContext) response.Response {
	logger.Log.Info("Request to assign Dashboard Role to the User")
	cmd := user.UserRoleMappingCommand{}
	var err error
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	cmd.OrgID = c.OrgID
	cmd.ID, err = strconv.ParseInt(web.Params(c.Req)[":userId"], 10, 64)
	if err != nil {
		return response.Error(http.StatusBadRequest, "userId is invalid", err)
	}

	if err := user.AddUserBHDRole(c.Req.Context(), p.store, &cmd); err != nil {
		return response.Error(500, "Failed to add user role mapping.", err)
	}

	logger.Log.Info("Dashboard Role assigned successfully to the User")
	return response.Success("User role mapping added.")
}

func (p *PluginsAPI) RemoveUserBHDRole(c *contextmodel.ReqContext) response.Response {
	logger.Log.Info("Request to remove Dashboard Role assigned to the User")
	cmd := user.UserRoleMappingCommand{}
	var err error
	cmd.OrgID = c.OrgID
	cmd.ID, err = strconv.ParseInt(web.Params(c.Req)[":userId"], 10, 64)
	if err != nil {
		return response.Error(http.StatusBadRequest, "User Id is invalid", err)
	}

	var roleId = web.Params(c.Req)[":roleId"]
	if roleId != "" {
		cmd.RoleId, err = strconv.ParseInt(roleId, 10, 64)
		if err != nil {
			return response.Error(http.StatusBadRequest, "Role Id is invalid", err)
		}
	}

	if err := user.RemoveUserBHDRole(c.Req.Context(), p.store, &cmd); err != nil {
		return response.Error(500, "Failed to remove user role mapping.", err)
	}
	logger.Log.Info("Dashboard Role assigned to the User, removed successfully")
	if cmd.RoleId == 0 {
		return response.Success("User role mapping removed for all roles.")
	} else {
		return response.Success("User role mapping removed for role : " + web.Params(c.Req)[":roleId"])
	}

}
