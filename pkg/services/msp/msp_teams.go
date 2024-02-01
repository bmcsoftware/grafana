package msp

import (
	"github.com/grafana/grafana/pkg/api/dtos"
	ac "github.com/grafana/grafana/pkg/services/accesscontrol"
	"net/http"
	"strconv"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/org"
)

func (s *Service) SearchTeams(c *models.ReqContext) response.Response {
	// Todo: may change if we have more than one msp org associated with a user
	// By then we will have to change the logic to get all the msp users associated with the msp org id
	perPage := c.QueryInt("perpage")
	if perPage <= 0 {
		perPage = 1000
	}
	page := c.QueryInt("page")
	if page < 1 {
		page = 1
	}
	// Using accesscontrol the filtering is done based on user permissions
	userIdFilter := models.FilterIgnoreUser
	if s.AccessControl.IsDisabled() && !c.IsOrg0User {
		userIdFilter = userFilter(c)
	}

	query := &models.SearchTeamsQuery{
		OrgId:        c.OrgID,
		Query:        c.Query("query"),
		Name:         c.Query("name"),
		UserIdFilter: userIdFilter,
		Page:         page,
		Limit:        perPage,
		SignedInUser: c.SignedInUser,
		HiddenUsers:  s.Cfg.HiddenUsers,
	}

	err := s.teamService.SearchTeams(c.Req.Context(), query)
	if err != nil {
		return response.Error(500, "Failed to search Teams", err)
	}

	teamList := make([]*models.TeamDTO, 0)
	teamIDs := GetMspOrgIdsFromCtx(c)
	for _, team := range query.Result.Teams {
		if Includes(team.Id, teamIDs) || c.IsOrg0User {
			team.AvatarUrl = dtos.GetGravatarUrlWithDefault(team.Email, team.Name)
			teamList = append(teamList, team)
		}
	}

	teamListIDs := map[string]bool{}
	for _, team := range query.Result.Teams {
		team.AvatarUrl = dtos.GetGravatarUrlWithDefault(team.Email, team.Name)
		teamListIDs[strconv.FormatInt(team.Id, 10)] = true
	}

	metadata := s.getMultiAccessControlMetadata(c, c.OrgID, "teams:id:", teamListIDs)
	if len(metadata) > 0 {
		for _, team := range query.Result.Teams {
			team.AccessControl = metadata[strconv.FormatInt(team.Id, 10)]
		}
	}

	query.Result.Teams = teamList
	query.Result.Page = page
	query.Result.PerPage = perPage

	return response.JSON(http.StatusOK, query.Result)

}

// UserFilter returns the user ID used in a filter when querying a team
// 1. If the user is a viewer or editor, this will return the user's ID.
// 2. If the user is an admin, this will return models.FilterIgnoreUser (0)
func userFilter(c *models.ReqContext) int64 {
	userIdFilter := c.SignedInUser.UserID
	if c.OrgRole == org.RoleAdmin {
		userIdFilter = models.FilterIgnoreUser
	}
	return userIdFilter
}

// getMultiAccessControlMetadata returns the accesscontrol metadata associated with a given set of resources
// Context must contain permissions in the given org (see LoadPermissionsMiddleware or AuthorizeInOrgMiddleware)
func (s *Service) getMultiAccessControlMetadata(c *models.ReqContext,
	orgID int64, prefix string, resourceIDs map[string]bool) map[string]ac.Metadata {
	if s.AccessControl.IsDisabled() || !c.QueryBool("accesscontrol") {
		return map[string]ac.Metadata{}
	}

	if c.SignedInUser.Permissions == nil {
		return map[string]ac.Metadata{}
	}

	permissions, ok := c.SignedInUser.Permissions[orgID]
	if !ok {
		return map[string]ac.Metadata{}
	}

	return ac.GetResourcesMetadata(c.Req.Context(), permissions, prefix, resourceIDs)
}
