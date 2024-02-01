package msp

import (
	"fmt"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/services/user"
	"net/http"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
)

func (s *Service) GetOrgUsersForCurrentOrgLookup(c *models.ReqContext) response.Response {
	usersList, err := s.getTeamMembers(c)

	if err != nil {
		return response.Error(500, "Failed to get users for organization", err)
	}

	filteredMembers := make([]*dtos.UserLookupDTO, 0, len(usersList))
	for _, member := range usersList {
		if dtos.IsHiddenUser(member.Login, c.SignedInUser, &s.Cfg) {
			continue
		}

		member.AvatarUrl = dtos.GetGravatarUrl(member.Email)
		member.Labels = []string{}

		filteredMembers = append(filteredMembers, &dtos.UserLookupDTO{
			UserID:    member.UserId,
			Login:     member.Login,
			AvatarURL: member.AvatarUrl,
		})
	}

	// remove duplicate users
	uniqueUsers := make(map[int64]*dtos.UserLookupDTO)
	for _, user := range filteredMembers {
		uniqueUsers[user.UserID] = user
	}

	// convert map to slice
	filteredMembers = make([]*dtos.UserLookupDTO, 0, len(uniqueUsers))
	for _, user := range uniqueUsers {
		filteredMembers = append(filteredMembers, user)
	}

	return response.JSON(http.StatusOK, filteredMembers)
}

func (s *Service) getTeamMembers(c *models.ReqContext) ([]*models.TeamMemberDTO, error) {
	mspTeamIDs := GetMspOrgIdsFromCtx(c)
	query := &GetTeamMembersByIdsQuery{OrgId: c.OrgID, TeamIds: mspTeamIDs, SignedInUser: c.SignedInUser}
	err := s.GetTeamMembersByIds(c, query)
	return query.Result, err
}

type GetTeamMembersByIdsQuery struct {
	OrgId        int64
	UserId       int64
	TeamIds      []int64
	External     bool
	SignedInUser *user.SignedInUser
	Result       []*models.TeamMemberDTO
}

// BMC Change - MSP Duplicated code from teamimpl/store.go
func (s *Service) GetTeamMembersByIds(c *models.ReqContext, query *GetTeamMembersByIdsQuery) error {
	return s.store.WithTransactionalDbSession(c.Req.Context(), func(dbSess *sqlstore.DBSession) error {
		query.Result = make([]*models.TeamMemberDTO, 0)
		sess := dbSess.Table("team_member")
		sess.Join("INNER", s.store.GetDialect().Quote("user"),
			fmt.Sprintf("team_member.user_id=%s.%s", s.store.GetDialect().Quote("user"), s.store.GetDialect().Quote("id")),
		)

		// explicitly check for serviceaccounts
		sess.Where(fmt.Sprintf("%s.is_service_account=?", s.store.GetDialect().Quote("user")), s.store.GetDialect().BooleanStr(false))

		// Join with only most recent auth module
		authJoinCondition := `(
		SELECT id from user_auth
			WHERE user_auth.user_id = team_member.user_id
			ORDER BY user_auth.created DESC `
		authJoinCondition = "user_auth.id=" + authJoinCondition + s.store.GetDialect().Limit(1) + ")"
		sess.Join("LEFT", "user_auth", authJoinCondition)

		if query.OrgId != 0 {
			sess.Where("team_member.org_id=?", query.OrgId)
		}
		if len(query.TeamIds) != 0 {
			sess.In("team_member.team_id", query.TeamIds)
		}
		if query.UserId != 0 {
			sess.Where("team_member.user_id=?", query.UserId)
		}
		if query.External {
			sess.Where("team_member.external=?", s.store.GetDialect().BooleanStr(true))
		}
		sess.Cols(
			"team_member.org_id",
			"team_member.team_id",
			"team_member.user_id",
			"user.email",
			"user.name",
			"user.login",
			"team_member.external",
			"team_member.permission",
			"user_auth.auth_module",
		)
		sess.Asc("user.login", "user.email")

		return sess.Find(&query.Result)
	})
}
