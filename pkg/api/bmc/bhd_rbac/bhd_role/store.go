package bhd_role

import (
	"bytes"
	"context"
	"fmt"

	logger "github.com/grafana/grafana/pkg/api/bmc/bhd_rbac"
	"github.com/grafana/grafana/pkg/services/msp"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/lib/pq"
)

func CreateBHDRole(ctx context.Context, store sqlstore.SQLStore, request *BHDRoleDTORequest) (*CreateBHDRoleResponse, error) {
	queryResult := CreateBHDRoleResponse{}
	id := 0
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		//Using a separate SQL query to verify if the Dashboard Role Name already exists or not, rather than an error code due to unnecessary auto increment ID
		count, err := sess.Table("bhd_role").Where("(name = ? AND org_id = ?) OR (name = ? AND system_role = ?)", request.Name, request.OrgID, request.Name, true).Count(&BHDRoleDTO{})
		if err != nil {
			return err
		}
		if count > 0 {
			return ErrRoleAlreadyExist
		}
		insertStat := `INSERT INTO bhd_role(name, description, org_id, system_role, created_time, updated_time, created_by, updated_by)
                         VALUES ($1, $2, $3, $4,$5, $6, $7, $8) RETURNING bhd_role_id`

		err = sess.DB().QueryRow(insertStat, request.Name, request.Description, request.OrgID, false, request.CreatedTime, request.UpdatedTime, request.CreatedBy, request.UpdatedBy).Scan(&id)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		queryResult.Message = RoleCreateFailureMsg
		return &queryResult, err
	}
	queryResult.Message = RoleCreateSuccessMsg
	queryResult.RoleId = id
	return &queryResult, nil
}

func GetBHDRole(ctx context.Context, store sqlstore.SQLStore, request *GetBHDRoleByIDQuery) (*BHDRoleDTO, error) {
	var queryResult *BHDRoleDTO
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		var sql bytes.Buffer
		params := make([]interface{}, 0)

		sql.WriteString(` SELECT * FROM bhd_role WHERE bhd_role_id = ? and (org_id = ? or system_role=true)`)
		params = append(params, request.ID, request.OrgID)

		var t BHDRoleDTO
		exists, err := sess.SQL(sql.String(), params...).Get(&t)

		if err != nil {
			return err
		}

		if !exists {
			return ErrRoleNotFound
		}

		queryResult = &t
		return nil
	})
	if err != nil {
		return nil, err
	}
	return queryResult, nil
}

func UpdateBHDRole(ctx context.Context, store sqlstore.SQLStore, request *BHDRoleDTORequest) (*MessageResponse, error) {
	queryResult := MessageResponse{}
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		count, err := sess.Table("bhd_role").Where("(name = ? AND org_id = ? AND bhd_role_id != ?) OR (name = ? AND system_role = ?)", request.Name, request.OrgID, request.ID, request.Name, true).Count(&BHDRoleDTO{})
		if err != nil {
			return err
		}
		if count > 0 {
			return ErrRoleAlreadyExist
		}
		if _, err := sess.Table("bhd_role").Where("bhd_role_id=?", request.ID).Update(request); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		queryResult.Message = RoleUpdateFailureMsg
		return &queryResult, err
	}
	queryResult.Message = RoleUpdateSuccessMsg
	return &queryResult, nil
}

func DeleteBHDRole(ctx context.Context, store sqlstore.SQLStore, request *BHDRoleDTORequest) (*MessageResponse, error) {
	queryResult := MessageResponse{}
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		if _, err := sess.Table("bhd_role").Delete(request); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		queryResult.Message = RoleDeleteFailureMsg
		return &queryResult, err
	}
	queryResult.Message = RoleDeleteSuccessMsg
	return &queryResult, nil
}

func SearchBHDRoles(ctx context.Context, store sqlstore.SQLStore, request *SearchBHDRolesQuery) (*SearchBHDRolesQueryResult, error) {
	queryResult := SearchBHDRolesQueryResult{
		BHDRoles: make([]*BHDRoleDTO, 0),
	}

	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		var sql bytes.Buffer
		var orderBy = "name"
		params := make([]interface{}, 0)

		sql.WriteString(` select bhd_role_id, name, description, org_id, system_role from bhd_role`)
		sql.WriteString(` WHERE (system_role=true OR org_id = ?)`)
		params = append(params, request.OrgID)

		queryWithWildcards := "%" + request.Query + "%"
		if request.Query != "" {
			sql.WriteString(` and name ` + store.GetDialect().LikeStr() + ` ?`)
			params = append(params, queryWithWildcards)
		}

		if request.Name != "" {
			sql.WriteString(` and name = ?`)
			params = append(params, request.Name)
		}

		if request.OrderBy != "" {
			orderBy = request.OrderBy
		}
		sql.WriteString(` order by ` + orderBy + ` asc`)

		if request.Limit != 0 {
			offset := request.Limit * (request.Page - 1)
			sql.WriteString(store.GetDialect().LimitOffset(int64(request.Limit), int64(offset)))
		}

		if err := sess.SQL(sql.String(), params...).Find(&queryResult.BHDRoles); err != nil {
			return err
		}
		r := BHDRoleDTO{}
		countSess := sess.Table("bhd_role")
		countSess.Where("(system_role=true OR org_id = ?)", request.OrgID)

		if request.Query != "" {
			countSess.Where(`name `+store.GetDialect().LikeStr()+` ?`, queryWithWildcards)
		}

		if request.Name != "" {
			countSess.Where("name=?", request.Name)
		}

		count, err := countSess.Count(&r)
		queryResult.TotalCount = count

		return err
	})

	if err != nil {
		return &SearchBHDRolesQueryResult{}, err
	}

	return &queryResult, nil
}

func UpdateUsersBHDRole(ctx context.Context, store sqlstore.SQLStore, request *UpdateUsersBHDRoleQuery) (*UpdateUsersBHDRoleQueryResult, error) {
	queryResult := UpdateUsersBHDRoleQueryResult{}

	userAdded := make([]UserBHDRoleMapping, 0)
	if len(request.UsersAdded) == 0 && len(request.UsersRemoved) == 0 {
		queryResult.Message = "User information is missing"
		return &queryResult, nil
	}
	for i := range request.UsersAdded {
		mapping := UserBHDRoleMapping{}
		mapping.OrgID = request.OrgID
		mapping.UserID = request.UsersAdded[i]
		mapping.BHDRoleID = request.ID
		userAdded = append(userAdded, mapping)
	}

	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		if len(request.UsersRemoved) > 0 {
			var sql bytes.Buffer
			params := make([]interface{}, 0)
			sql.WriteString(`DELETE FROM user_bhd_role WHERE bhd_role_id = ? and org_id = ? and user_id=any(?)`)
			params = append(params, request.ID, request.OrgID, pq.Array(request.UsersRemoved))

			var t int
			_, err := sess.SQL(sql.String(), params...).Count(&t)

			if err != nil {
				return err
			}
			logger.Log.Info("Deleted user role associations", "Count", t)
		}

		if len(request.UsersAdded) > 0 {
			opts := sqlstore.NativeSettingsForDialect(store.GetDialect())
			if _, err := sess.BulkInsert("user_bhd_role", userAdded, opts); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		pqErr := err.(*pq.Error)
		if pqErr.Code == "23505" {
			logger.Log.Warn(pqErr.Detail)
			logger.Log.Warn("Failed to update user role associations due to unique constraint violations.")
			logger.Log.Warn("Delete associations and try to update again")
			err := deleteAndInsertUserRoleAssociations(ctx, store, userAdded)

			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	queryResult.Message = "Users role updated successfully"
	return &queryResult, nil
}

func deleteAndInsertUserRoleAssociations(ctx context.Context, store sqlstore.SQLStore, users []UserBHDRoleMapping) error {
	logger.Log.Warn("Delete user role associations and update it again")
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		idList := make([]int64, 0)
		var bhdRoleId int64 = 0
		var orgId int64 = 0
		for i := range users {
			idList = append(idList, users[i].UserID)
			bhdRoleId = users[i].BHDRoleID
			orgId = users[i].OrgID
		}
		var sql bytes.Buffer
		params := make([]interface{}, 0)
		sql.WriteString(`DELETE FROM user_bhd_role WHERE bhd_role_id = ? and org_id = ? and user_id=any(?)`)
		params = append(params, bhdRoleId, orgId, pq.Array(idList))

		var t int
		_, err := sess.SQL(sql.String(), params...).Count(&t)

		if err != nil {
			return err
		}

		opts := sqlstore.NativeSettingsForDialect(store.GetDialect())

		if _, err := sess.BulkInsert("user_bhd_role", users, opts); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func UpdateTeamsBHDRole(ctx context.Context, store sqlstore.SQLStore, request *UpdateTeamsBHDRoleQuery) (*UpdateTeamsBHDRoleQueryResult, error) {
	queryResult := UpdateTeamsBHDRoleQueryResult{}

	teamsAdded := make([]TeamBHDRoleMapping, 0)
	if len(request.TeamsAdded) == 0 && len(request.TeamsRemoved) == 0 {
		queryResult.Message = "Teams information is missing"
		return &queryResult, nil
	}
	for i := range request.TeamsAdded {
		mapping := TeamBHDRoleMapping{}
		mapping.OrgID = request.OrgID
		mapping.TeamID = request.TeamsAdded[i]
		mapping.BHDRoleID = request.ID
		teamsAdded = append(teamsAdded, mapping)
	}

	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		if len(request.TeamsRemoved) > 0 {
			var sql bytes.Buffer
			params := make([]interface{}, 0)

			sql.WriteString(`DELETE FROM team_bhd_role WHERE bhd_role_id = ? and org_id = ? and team_id=any(?)`)
			params = append(params, request.ID, request.OrgID, pq.Array(request.TeamsRemoved))

			var t int
			_, err := sess.SQL(sql.String(), params...).Count(&t)

			if err != nil {
				return err
			}
			logger.Log.Info("Deleted team role associations", "Count", t)
		}
		if len(request.TeamsAdded) > 0 {
			opts := sqlstore.NativeSettingsForDialect(store.GetDialect())

			if _, err := sess.BulkInsert("team_bhd_role", teamsAdded, opts); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		pqErr := err.(*pq.Error)
		if pqErr.Code == "23505" {
			logger.Log.Warn(pqErr.Detail)
			logger.Log.Warn("Failed to update team role associations due to unique constraint violations.")
			logger.Log.Warn("Delete associations and try to update again")
			err := deleteAndInsertTeamRoleAssociations(ctx, store, teamsAdded)

			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	queryResult.Message = "Teams role updated successfully"
	return &queryResult, nil
}

func deleteAndInsertTeamRoleAssociations(ctx context.Context, store sqlstore.SQLStore, teams []TeamBHDRoleMapping) error {
	logger.Log.Info("Delete team role associations and update it again")
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		idList := make([]int64, 0)
		var bhdRoleId int64 = 0
		var orgId int64 = 0
		for i := range teams {
			idList = append(idList, teams[i].TeamID)
			bhdRoleId = teams[i].BHDRoleID
			orgId = teams[i].OrgID
		}
		var sql bytes.Buffer
		params := make([]interface{}, 0)
		sql.WriteString(`DELETE FROM team_bhd_role WHERE bhd_role_id = ? and org_id = ? and team_id=any(?)`)
		params = append(params, bhdRoleId, orgId, pq.Array(idList))

		var t int
		_, err := sess.SQL(sql.String(), params...).Count(&t)

		if err != nil {
			return err
		}
		opts := sqlstore.NativeSettingsForDialect(store.GetDialect())

		if _, err := sess.BulkInsert("team_bhd_role", teams, opts); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func GetBHDRoleIdByUserId(ctx context.Context, store sqlstore.SQLStore, userId int64) ([]int64, error) {
	var queryResult = make([]int64, 0)
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		var sql bytes.Buffer
		params := make([]interface{}, 0)
		sql.WriteString(` SELECT bhd_role_id FROM public.user_bhd_role where user_id=?
		                  union
                          SELECT bhd_role_id FROM public.team_bhd_role  where team_id in (SELECT team_id FROM public.team_member where user_id=?)
		                  order by bhd_role_id`)
		params = append(params, userId, userId)

		if err := sess.SQL(sql.String(), params...).Find(&queryResult); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return nil, err
	}
	return queryResult, nil
}

func GetRbacRolePermissions(ctx context.Context, store sqlstore.SQLStore, query GetRolePermissionDTO) ([]BHDOrgRolePermission, error) {
	var permissions []BHDOrgRolePermission = make([]BHDOrgRolePermission, 0)
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		rawSQL := `
		SELECT p.name, "group", (
			CASE WHEN p.name IN (
				SELECT name
				FROM bhd_role_permission rp
				WHERE p.name = rp.bhd_permission_name
				AND rp.bhd_role_id=?
				AND rp.org_id=?
			) THEN true ELSE false END) as status
		FROM bhd_permission p
		GROUP BY 1
		ORDER BY 1`
		return sess.SQL(rawSQL, query.RoleID, query.OrgID).Find(&permissions)
	})

	return permissions, err
}

// UpdateRbacRolePermissions will update the list of permissions for a given role
func UpdateRbacRolePermissions(ctx context.Context, store sqlstore.SQLStore, query UpdateRolePermissionsQuery) error {
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		// If role is role_system then do not allow to update permissions
		if msp.Includes(query.RoleID, []int64{1, 2, 3}) {
			return fmt.Errorf("System roles are not allowed to be update")
		}

		logger.Log.Info("Deleting old permissions", "role_id", query.RoleID)
		deleteQuery := DeleteByRoleID{RoleID: query.RoleID, OrgID: query.OrgID}
		if _, err := sess.Table("bhd_role_permission").Delete(deleteQuery); err != nil {
			logger.Log.Error("Failed to delete permissions", "error", err)
			return err
		}

		permissions := make([]AddBHDOrgRolePermission, 0)
		for _, permissionName := range query.Permissions {
			permissions = append(permissions, AddBHDOrgRolePermission{
				RoleID:         query.RoleID,
				PermissionName: permissionName,
				OrgID:          query.OrgID,
			})
		}
		if _, err := sess.Table("bhd_role_permission").InsertMulti(permissions); err != nil {
			return err
		}
		return nil
	})
	return err
}

// GetRbacRolePermissionsByUserID will return the list of all permissions for the given user either directly or from teams
func GetRbacRolePermissionsByUserID(ctx context.Context, store sqlstore.SQLStore, userID int64) (map[string]bool, error) {
	var permissions []string
	rawSQL := `SELECT DISTINCT bhd_permission_name
	FROM bhd_role_permission
	WHERE bhd_role_id IN (
		SELECT bhd_role_id
		FROM user_bhd_role
		WHERE user_id = ?
		UNION
		SELECT bhd_role_id
		FROM team_member tm
		INNER JOIN team_bhd_role r ON r.team_id = tm.team_id
		WHERE user_id = ?
	) ORDER BY 1`

	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		return sess.SQL(rawSQL, userID, userID).Find(&permissions)
	})
	if err != nil {
		return GetMapPermissions(permissions), err
	}

	return GetMapPermissions(permissions), nil
}

// GetRbacRolePermissionsByTeamID will return the list of all permissions for the given team
func GetRbacRolePermissionsByTeamID(ctx context.Context, store sqlstore.SQLStore, teamID int64) (map[string]bool, error) {
	var permissions []string
	rawSQL := `
		SELECT bhd_permission_name
		FROM team_bhd_role tr
		INNER JOIN bhd_role_permission rp ON rp.bhd_role_id= tr.bhd_role_id
		WHERE team_id=?
		ORDER BY 1`
	err := store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		return sess.SQL(rawSQL, teamID).Find(&permissions)
	})
	if err != nil {
		return GetMapPermissions(permissions), err
	}
	return GetMapPermissions(permissions), nil
}

func GetMapPermissions(permissions []string) map[string]bool {
	resp := make(map[string]bool)
	for _, permission := range permissions {
		resp[permission] = true
	}
	return resp
}
