package sqlstore

import (
	"context"
	"strconv"
	"time"

	"github.com/grafana/grafana/pkg/models"
	orga "github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/user"
)

func (ss *SQLStore) AddOrgUser(ctx context.Context, cmd *models.AddOrgUserCommand) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		// check if user exists
		var usr user.User
		session := sess.ID(cmd.UserId)
		if !cmd.AllowAddingServiceAccount {
			session = session.Where(NotServiceAccountFilter(ss))
		}

		if exists, err := session.Get(&usr); err != nil {
			return err
		} else if !exists {
			return user.ErrUserNotFound
		}

		if res, err := sess.Query("SELECT 1 from org_user WHERE org_id=? and user_id=?", cmd.OrgId, usr.ID); err != nil {
			return err
		} else if len(res) == 1 {
			return models.ErrOrgUserAlreadyAdded
		}

		if res, err := sess.Query("SELECT 1 from org WHERE id=?", cmd.OrgId); err != nil {
			return err
		} else if len(res) != 1 {
			return models.ErrOrgNotFound
		}

		entity := models.OrgUser{
			OrgId:   cmd.OrgId,
			UserId:  cmd.UserId,
			Role:    cmd.Role,
			Created: time.Now(),
			Updated: time.Now(),
		}

		_, err := sess.Insert(&entity)
		if err != nil {
			return err
		}

		var userOrgs []*models.UserOrgDTO
		sess.Table("org_user")
		sess.Join("INNER", "org", "org_user.org_id=org.id")
		sess.Where("org_user.user_id=? AND org_user.org_id=?", usr.ID, usr.OrgID)
		sess.Cols("org.name", "org_user.role", "org_user.org_id")
		err = sess.Find(&userOrgs)

		if err != nil {
			return err
		}

		if len(userOrgs) == 0 {
			return setUsingOrgInTransaction(sess, usr.ID, cmd.OrgId)
		}

		return nil
	})
}
// BMC Software Code - Add Admin to all orgs
// TO BE VERFIED. Majority of the code from this file has been moved out to pkg\services\org\orgimpl\store.go. Should the below code be also moved to the same file?
type GetAllOrgs struct {
	Id int64 `xorm:"id"`
}

func (ss *SQLStore) addAdminToAllOrgs(ctx context.Context, userID int64) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		// Get all orgs
		orgs := make([]*GetAllOrgs, 0)
		err := sess.SQL("SELECT id FROM org WHERE id not in (SELECT org_id FROM org_user WHERE user_id = ?)", userID).Find(&orgs)
		if err != nil {
			ss.log.Error("Failed to fetch list of organizations", "error", err)
			return err
		}
		if len(orgs) == 0 {
			ss.log.Info("No organizations to sync with grafana admin")
			return nil
		}
		ss.log.Info("Found " + strconv.Itoa(len(orgs)) + " organizations")
		//Loop and add admin to each org
		queries := make([]*models.OrgUser, 0)
		for _, org := range orgs {
			queries = append(queries, &models.OrgUser{
				OrgId:   org.Id,
				UserId:  userID,
				Role:    orga.RoleAdmin,
				Created: time.Now(),
				Updated: time.Now(),
			})
		}
		ss.log.Info("Adding admin to " + strconv.Itoa(len(queries)) + " organizations")
		_, err = sess.Insert(queries)
		if err != nil {
			ss.log.Warn("Failed to add grafana admin user to org", "error", err)
		} else {
			ss.log.Warn("Successfully added grafana admin user to org", "error", err)
		}
		return nil
	})
}

// BMC Software Code - END
