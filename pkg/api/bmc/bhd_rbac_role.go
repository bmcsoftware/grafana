package bmc

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	logger "github.com/grafana/grafana/pkg/api/bmc/bhd_rbac"
	role "github.com/grafana/grafana/pkg/api/bmc/bhd_rbac/bhd_role"
	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/web"
)

func (p *PluginsAPI) CreateBHDRole(c *contextmodel.ReqContext) response.Response {
	request := role.BHDRoleDTORequest{}
	var err error

	if err := web.Bind(c.Req, &request); err != nil {
		logger.Log.Error("Bad request data", "error", err)
		return response.Error(http.StatusBadRequest, "Bad request data", err)
	}
	request.OrgID = c.OrgID
	request.CreatedTime = time.Now()
	request.UpdatedTime = time.Now()
	request.CreatedBy = c.Login
	request.UpdatedBy = c.Login
	logger.Log.Info("Role create request", "request", request)
	request.Name = strings.Trim(request.Name, " ")
	if request.Name == "" {
		logger.Log.Error("Role name is missing")
		return response.Error(http.StatusBadRequest, role.RoleNameMissingMsg, role.ErrRoleNameMissing)
	}
	result, err := role.CreateBHDRole(c.Req.Context(), p.store, &request)
	if err != nil {
		logger.Log.Error("Failed to create role", "Name", request.Name, "error", err)
		if errors.Is(err, role.ErrRoleAlreadyExist) {
			return response.Error(http.StatusConflict, role.RoleAlreadyExistMsg, err)
		} else {
			return response.Error(http.StatusInternalServerError, role.RoleCreateFailureMsg, err)
		}
	}
	logger.Log.Info("Role created successfully", "Name", request.Name)
	return response.JSON(http.StatusOK, &result)
}

func (p *PluginsAPI) GetBHDRole(c *contextmodel.ReqContext) response.Response {
	roleIdStr := web.Params(c.Req)[":roleId"]
	//Dashboard Role Id Validation
	validationResponse := p.ValidateDashboardRoleId(c, roleIdStr)
	if validationResponse != nil {
		return validationResponse
	}
	roleId, _ := strconv.ParseInt(roleIdStr, 10, 64)

	request := role.GetBHDRoleByIDQuery{
		OrgID: c.OrgID,
		ID:    roleId,
	}
	logger.Log.Info("Role get request", "request", request)
	result, err := role.GetBHDRole(c.Req.Context(), p.store, &request)
	if err != nil {
		if errors.Is(err, role.ErrRoleNotFound) {
			logger.Log.Error("Failed to get role", "error", err)
			return response.Error(http.StatusNotFound, role.RoleNotFoundMsg, err)
		}
		logger.Log.Error("Failed to get role", "error", err)
		return response.Error(http.StatusInternalServerError, role.RoleGetFailureMsg, err)
	}
	logger.Log.Info("Role found", "Id", roleId)
	return response.JSON(http.StatusOK, &result)
}

func (p *PluginsAPI) UpdateBHDRole(c *contextmodel.ReqContext) response.Response {
	request := role.BHDRoleDTORequest{}
	var err error
	if err := web.Bind(c.Req, &request); err != nil {
		logger.Log.Error("Bad request data", "error", err)
		return response.Error(http.StatusBadRequest, "Bad request data", err)
	}

	//Dashboard Role Id Validation
	roleIdStr := web.Params(c.Req)[":roleId"]
	validationResponse := p.ValidateDashboardRoleId(c, roleIdStr)
	if validationResponse != nil {
		return validationResponse
	}
	request.Name = strings.Trim(request.Name, " ")
	if request.Name == "" {
		logger.Log.Error("Role name is missing")
		return response.Error(http.StatusBadRequest, role.RoleNameMissingMsg, role.ErrRoleNameMissing)
	}
	roleId, _ := strconv.ParseInt(roleIdStr, 10, 64)
	request.ID = roleId
	request.OrgID = c.OrgID
	request.UpdatedTime = time.Now()
	request.UpdatedBy = c.Login
	logger.Log.Info("Role update request", "request", request)
	result, err := role.UpdateBHDRole(c.Req.Context(), p.store, &request)
	if err != nil {
		if errors.Is(err, role.ErrRoleNotFound) {
			logger.Log.Error("Failed to update role", "error", err)
			return response.Error(http.StatusNotFound, role.RoleNotFoundMsg, err)
		} else if errors.Is(err, role.ErrRoleAlreadyExist) {
			logger.Log.Error("Failed to update role", "error", err)
			return response.Error(http.StatusConflict, role.RoleAlreadyExistMsg, err)
		}
		logger.Log.Error("Failed to update role", "error", err)
		return response.Error(http.StatusInternalServerError, role.RoleUpdateFailureMsg, err)
	}
	logger.Log.Info("Role updated successfully", "ID", request.ID)
	return response.JSON(http.StatusOK, &result)
}

func (p *PluginsAPI) DeleteBHDRole(c *contextmodel.ReqContext) response.Response {
	var err error
	//Dashboard Role Id Validation
	roleIdStr := web.Params(c.Req)[":roleId"]
	validationResponse := p.ValidateDashboardRoleId(c, roleIdStr)
	if validationResponse != nil {
		return validationResponse
	}
	roleId, _ := strconv.ParseInt(roleIdStr, 10, 64)
	request := role.BHDRoleDTORequest{
		OrgID: c.OrgID,
		ID:    roleId,
	}
	logger.Log.Info("Role delete request", "request", request)
	result, err := role.DeleteBHDRole(c.Req.Context(), p.store, &request)
	if err != nil {
		if errors.Is(err, role.ErrRoleNotFound) {
			logger.Log.Error("Role not found", "error", err)
			return response.Error(http.StatusNotFound, role.RoleNotFoundMsg, err)
		}
		logger.Log.Error("Failed to delete role", "error", err)
		return response.Error(http.StatusInternalServerError, role.RoleDeleteFailureMsg, err)
	}
	logger.Log.Info("Role deleted successfully", "ID", request.ID)
	return response.JSON(http.StatusOK, &result)
}

func (p *PluginsAPI) SearchBHDRoles(c *contextmodel.ReqContext) response.Response {

	perPage := c.QueryInt("perpage")
	if perPage <= 0 {
		perPage = 1000
	}
	page := c.QueryInt("page")
	if page < 1 {
		page = 1
	}
	request := role.SearchBHDRolesQuery{
		OrgID:   c.OrgID,
		Query:   c.Query("query"),
		Name:    c.Query("name"),
		OrderBy: c.Query("sortby"),
		Page:    page,
		Limit:   perPage,
	}
	logger.Log.Info("Role search request", "request", request)
	result, err := role.SearchBHDRoles(c.Req.Context(), p.store, &request)
	if err != nil {
		logger.Log.Error("Failed to search roles", "error", err)
		return response.Error(500, "Failed to search roles", err)
	}
	result.Page = page
	result.PerPage = perPage
	logger.Log.Info("Role search request processed successfully", "Total Count", result.TotalCount)
	return response.JSON(http.StatusOK, result)
}

func (p *PluginsAPI) UpdateUsersRole(c *contextmodel.ReqContext) response.Response {
	logger.Log.Info("Update Users Role request")
	request := role.UpdateUsersBHDRoleQuery{}
	var err error
	if err := web.Bind(c.Req, &request); err != nil {
		logger.Log.Error("Bad request data", "error", err)
		return response.Error(http.StatusBadRequest, "Bad request data", err)
	}
	request.OrgID = c.OrgID
	//Dashboard Role Id Validation
	roleIdStr := web.Params(c.Req)[":roleId"]
	validationResponse := p.ValidateDashboardRoleId(c, roleIdStr)
	if validationResponse != nil {
		return validationResponse
	}
	request.ID, _ = strconv.ParseInt(roleIdStr, 10, 64)

	result, err := role.UpdateUsersBHDRole(c.Req.Context(), p.store, &request)
	if err != nil {
		logger.Log.Error("Failed to update Users Role", "error", err)
		return response.Error(500, "Failed to update Users Role", err)
	}
	logger.Log.Info("Users Role updated successfully", "Id", request.ID)
	return response.JSON(http.StatusOK, &result)
}

func (p *PluginsAPI) UpdateTeamsRole(c *contextmodel.ReqContext) response.Response {
	logger.Log.Info("Update Teams Role request")
	request := role.UpdateTeamsBHDRoleQuery{}
	var err error

	if err := web.Bind(c.Req, &request); err != nil {
		logger.Log.Error("Bad request data", "error", err)
		return response.Error(http.StatusBadRequest, "Bad request data", err)
	}
	request.OrgID = c.OrgID

	//Dashboard Role Id Validation
	roleIdStr := web.Params(c.Req)[":roleId"]
	validationResponse := p.ValidateDashboardRoleId(c, roleIdStr)
	if validationResponse != nil {
		return validationResponse
	}
	request.ID, _ = strconv.ParseInt(roleIdStr, 10, 64)

	result, err := role.UpdateTeamsBHDRole(c.Req.Context(), p.store, &request)
	if err != nil {
		logger.Log.Error("Failed to update Teams Role", "error", err)
		return response.Error(500, "Failed to update Teams Role", err)
	}
	logger.Log.Info("Teams Role updated successfully", "Id", request.ID)
	return response.JSON(http.StatusOK, &result)
}

func (p *PluginsAPI) ValidateDashboardRoleId(c *contextmodel.ReqContext, roleIdStr string) response.Response {
	var err error
	var RoleID int64
	RoleID, err = strconv.ParseInt(roleIdStr, 10, 64)
	if err != nil {
		logger.Log.Error("Role id is invalid", "error", err)
		return response.Error(http.StatusBadRequest, "Role id is invalid", err)
	}
	request := role.GetBHDRoleByIDQuery{
		OrgID: c.OrgID,
		ID:    RoleID,
	}
	result, err := role.GetBHDRole(c.Req.Context(), p.store, &request)
	if err != nil {
		if errors.Is(err, role.ErrRoleNotFound) {
			logger.Log.Error("Role not found", "error", err)
			return response.Error(http.StatusNotFound, role.RoleNotFoundMsg, err)
		}
		logger.Log.Error("Failed to validated role id", "error", err)
		return response.Error(http.StatusBadRequest, "Failed to validated role id", err)
	}
	logger.Log.Debug("Dashboard Role Found", "Dashboard Role", result)
	return nil
}

//********************* BHD Role - Permissions : Start *****************************

func (p *PluginsAPI) GetRolePermissions(c *contextmodel.ReqContext) response.Response {
	//Dashboard Role Id Validation
	roleIdStr := web.Params(c.Req)[":roleId"]
	validationResponse := p.ValidateDashboardRoleId(c, roleIdStr)
	if validationResponse != nil {
		return validationResponse
	}
	roleId, _ := strconv.ParseInt(roleIdStr, 10, 64)
	//query := role.GetRolePermissionDTO{RoleID: roleId, OrgID: c.OrgID}
	//permissions, err := role.GetRbacRolePermissions(c.Req.Context(), p.store, query)

	//Temporary handling. Remove this line and un comment above two lines once all permissions are finalized in the database
	permissions, err := GetRbacRolePermissions(roleId)
	if err != nil {
		return response.Error(http.StatusInternalServerError, "Failed to get permissions list", err)
	}

	return response.JSON(200, permissions)
}

func (p *PluginsAPI) UpdateRolePermissions(c *contextmodel.ReqContext) response.Response {
	roleID, err := strconv.ParseInt(web.Params(c.Req)[":roleId"], 10, 64)
	if err != nil {
		return response.Error(http.StatusBadRequest, "Dashboard Role Id is Invalid", err)
	}

	cmd := role.UpdateRolePermissionsDTO{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "Bad request data", err)
	}

	query := role.UpdateRolePermissionsQuery{
		RoleID:      roleID,
		Permissions: cmd.Permissions,
		OrgID:       c.OrgID,
	}
	if err := role.UpdateRbacRolePermissions(c.Req.Context(), p.store, query); err != nil {
		return response.Error(http.StatusInternalServerError, "Failed to update permissions list", err)
	}

	return response.Success("Permissions updated")
}

//********************* BHD Role - Permissions : End *****************************

// Using temporary hardcoded permissions. Once all permissions are finalized in the database, remove this code and read role-based permission from it.
func GetRbacRolePermissions(roleId int64) ([]role.BHDOrgRolePermission, error) {
	if roleId == 1 {
		adminPermissions := []role.BHDOrgRolePermission{{"dashboards:create", "Dashboards", true}, {"dashboards:delete", "Dashboards", true}, {"dashboards:read", "Dashboards", true}, {"dashboards:write", "Dashboards", true}, {"datasources:create", "Datasources", true}, {"datasources:delete", "Datasources", true}, {"datasources:read", "Datasources", true}, {"datasources:write", "Datasources", true}, {"folders:create", "Folders", true}, {"folders:delete", "Folders", true}, {"folders:read", "Folders", true}, {"folders:write", "Folders", true}, {"preferences:read", "Preferences", true}, {"preferences:write", "Preferences", true}, {"reports.history:read", "Reports History", true}, {"reports.settings:read", "Reports Settings", true}, {"reports.settings:write", "Reports Settings", true}, {"reports:create", "Reports", true}, {"reports:delete", "Reports", true}, {"reports:export", "Reports", true}, {"reports:read", "Reports", true}, {"reports:run", "Reports", true}, {"reports:write", "Reports", true}, {"roles:create", "Roles", true}, {"roles:delete", "Roles", true}, {"roles:read", "Roles", true}, {"roles:write", "Roles", true}, {"teams:create", "Teams", true}, {"teams:delete", "Teams", true}, {"teams:read", "Teams", true}, {"teams:write", "Teams", true}, {"users:create", "Users", true}, {"users:delete", "Users", true}, {"users:read", "Users", true}, {"users:write", "Users", true}}
		return adminPermissions, nil
	} else if roleId == 2 {
		editorPermissions := []role.BHDOrgRolePermission{{"dashboards:create", "Dashboards", true}, {"dashboards:delete", "Dashboards", true}, {"dashboards:read", "Dashboards", true}, {"dashboards:write", "Dashboards", true}, {"datasources:create", "Datasources", false}, {"datasources:delete", "Datasources", false}, {"datasources:read", "Datasources", true}, {"datasources:write", "Datasources", false}, {"folders:create", "Folders", true}, {"folders:delete", "Folders", true}, {"folders:read", "Folders", true}, {"folders:write", "Folders", true}, {"preferences:read", "Preferences", true}, {"preferences:write", "Preferences", true}, {"reports.history:read", "Reports History", false}, {"reports.settings:read", "Reports Settings", true}, {"reports.settings:write", "Reports Settings", false}, {"reports:create", "Reports", true}, {"reports:delete", "Reports", true}, {"reports:export", "Reports", true}, {"reports:read", "Reports", true}, {"reports:run", "Reports", true}, {"reports:write", "Reports", true}, {"roles:create", "Roles", false}, {"roles:delete", "Roles", false}, {"roles:read", "Roles", false}, {"roles:write", "Roles", false}, {"teams:create", "Teams", false}, {"teams:delete", "Teams", false}, {"teams:read", "Teams", true}, {"teams:write", "Teams", false}, {"users:create", "Users", false}, {"users:delete", "Users", false}, {"users:read", "Users", true}, {"users:write", "Users", false}}
		return editorPermissions, nil
	} else {
		viewerPermissions := []role.BHDOrgRolePermission{{"dashboards:create", "Dashboards", false}, {"dashboards:delete", "Dashboards", false}, {"dashboards:read", "Dashboards", true}, {"dashboards:write", "Dashboards", false}, {"datasources:create", "Datasources", false}, {"datasources:delete", "Datasources", false}, {"datasources:read", "Datasources", false}, {"datasources:write", "Datasources", false}, {"folders:create", "Folders", false}, {"folders:delete", "Folders", false}, {"folders:read", "Folders", true}, {"folders:write", "Folders", false}, {"preferences:read", "Preferences", false}, {"preferences:write", "Preferences", false}, {"reports.history:read", "Reports History", false}, {"reports.settings:read", "Reports Settings", false}, {"reports.settings:write", "Reports Settings", false}, {"reports:create", "Reports", false}, {"reports:delete", "Reports", false}, {"reports:export", "Reports", false}, {"reports:read", "Reports", false}, {"reports:run", "Reports", false}, {"reports:write", "Reports", false}, {"roles:create", "Roles", false}, {"roles:delete", "Roles", false}, {"roles:read", "Roles", false}, {"roles:write", "Roles", false}, {"teams:create", "Teams", false}, {"teams:delete", "Teams", false}, {"teams:read", "Teams", false}, {"teams:write", "Teams", false}, {"users:create", "Users", false}, {"users:delete", "Users", false}, {"users:read", "Users", false}, {"users:write", "Users", false}}
		return viewerPermissions, nil
	}
}
