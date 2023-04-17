package sqlstore

import (
	"context"
	"strings"

	"github.com/grafana/grafana/pkg/services/user"
)

func (ss *SQLStore) ensureGrafanaAdminUserIsAssociatedToAllOrgs() error {
	ctx := context.Background()
	err := ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		ss.log.Debug("Ensuring admin org is part of all orgs")
		if !ss.Cfg.DisableInitAdminCreation {
			query := &user.GetUserByLoginQuery{
				LoginOrEmail: ss.Cfg.AdminUser,
			}
			user, err := ss.GetByLogin(ctx, query)
			if err != nil {
				ss.log.Error("Failed to get super admin for organization sync", "error", err)
				return err
			}
			// Add the superuser to all existing organizations
			ss.log.Info("Adding admin user to all existing organizations", "user_id", user.ID, "user_login", user.Login)
			if err := ss.addAdminToAllOrgs(ctx, user.ID); err != nil {
				ss.log.Error("Failed to add admin user to all existing organizations", "error", err)
				return err
			}
			ss.log.Info("Grafana admin sync with orgs is complete", "user", ss.Cfg.AdminUser)
		}
		return nil
	})
	return err
}

func (ss *SQLStore) GetByLogin(ctx context.Context, query *user.GetUserByLoginQuery) (*user.User, error) {
	usr := &user.User{}
	err := ss.WithDbSession(ctx, func(sess *DBSession) error {
		if query.LoginOrEmail == "" {
			return user.ErrUserNotFound
		}

		var where string
		var has bool
		var err error

		// Since username can be an email address, attempt login with email address
		// first if the login field has the "@" symbol.
		if strings.Contains(query.LoginOrEmail, "@") {
			where = "email=?"
			if ss.Cfg.CaseInsensitiveLogin {
				where = "LOWER(email)=LOWER(?)"
			}
			has, err = sess.Where(where, query.LoginOrEmail).Get(usr)

			if err != nil {
				return err
			}
		}

		// Look for the login field instead of email
		if !has {
			where = "login=?"
			if ss.Cfg.CaseInsensitiveLogin {
				where = "LOWER(login)=LOWER(?)"
			}
			has, err = sess.Where(where, query.LoginOrEmail).Get(usr)
		}

		if err != nil {
			return err
		} else if !has {
			return user.ErrUserNotFound
		}
		if ss.Cfg.CaseInsensitiveLogin {
			if err := ss.userCaseInsensitiveLoginConflict(ctx, sess, usr.Login, usr.Email); err != nil {
				return err
			}
		}
		return nil
	})

	return usr, err
}

func (ss *SQLStore) userCaseInsensitiveLoginConflict(ctx context.Context, sess *DBSession, login, email string) error {
	users := make([]user.User, 0)

	if err := sess.Where("LOWER(email)=LOWER(?) OR LOWER(login)=LOWER(?)",
		email, login).Find(&users); err != nil {
		return err
	}

	if len(users) > 1 {
		return &user.ErrCaseInsensitiveLoginConflict{Users: users}
	}

	return nil
}
