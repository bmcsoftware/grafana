package database

import (
	"context"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/services/login"
)

func InitMetrics() {
	login.Once.Do(func() {
		login.MStatDuplicateUserEntries = prometheus.NewGauge(prometheus.GaugeOpts{
			Name:      "stat_users_total_duplicate_user_entries",
			Help:      "total number of duplicate user entries by email or login",
			Namespace: login.ExporterName,
		})

		login.MStatHasDuplicateEntries = prometheus.NewGauge(prometheus.GaugeOpts{
			Name:      "stat_users_has_duplicate_user_entries",
			Help:      "instance has duplicate user entries by email or login",
			Namespace: login.ExporterName,
		})

		login.MStatMixedCasedUsers = prometheus.NewGauge(prometheus.GaugeOpts{
			Name:      "stat_users_total_mixed_cased_users",
			Help:      "total number of users with upper and lower case logins or emails",
			Namespace: login.ExporterName,
		})

		prometheus.MustRegister(
			login.MStatDuplicateUserEntries,
			login.MStatHasDuplicateEntries,
			login.MStatMixedCasedUsers,
		)
	})
}

func (s *AuthInfoStore) RunMetricsCollection(ctx context.Context) error {
	if _, err := s.GetLoginStats(ctx); err != nil {
		s.logger.Warn("Failed to get authinfo metrics", "error", err.Error())
	}
	updateStatsTicker := time.NewTicker(login.MetricsCollectionInterval)
	defer updateStatsTicker.Stop()

	for {
		select {
		case <-updateStatsTicker.C:
			if _, err := s.GetLoginStats(ctx); err != nil {
				s.logger.Warn("Failed to get authinfo metrics", "error", err.Error())
			}
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

func (s *AuthInfoStore) GetLoginStats(ctx context.Context) (login.LoginStats, error) {
	var stats login.LoginStats
	outerErr := s.sqlStore.WithDbSession(ctx, func(dbSession *db.Session) error {
		// BMC Code - Start
		rawSQL := `SELECT (SELECT COUNT(*) AS duplicate_user_entries FROM (SELECT a.login FROM "user" a,` +
			` "user" b WHERE (LOWER(a.login) = LOWER(b.login)) AND (a.login != b.login) Union SELECT a.email from` +
			` "user" a, "user" b WHERE (LOWER(a.email) = LOWER(b.email)) AND (a.email != b.email)) As d), ` +
			`(SELECT COUNT(*) as mixed_cased_users FROM (SELECT login, email FROM "user"` +
			` WHERE (LOWER(login) != login OR LOWER(email) != email)) as mcu)`
		s.logger.Debug("GetLoginStats rawsql query is ", "GetLoginStats", rawSQL)
		// End
		_, err := dbSession.SQL(rawSQL).Get(&stats)
		return err
	})
	if outerErr != nil {
		// BMC Code - Next line
		s.logger.Error("Error while executing GetLoginStats is ", outerErr)
		return stats, outerErr
	}
	// BMC Code - Next line
	s.logger.Debug("Stats query output is  ", "DuplicateUserEntries", stats.DuplicateUserEntries, "MixedCasedUsers", stats.MixedCasedUsers)
	// set prometheus metrics stats
	login.MStatDuplicateUserEntries.Set(float64(stats.DuplicateUserEntries))
	if stats.DuplicateUserEntries == 0 {
		login.MStatHasDuplicateEntries.Set(float64(0))
	} else {
		login.MStatHasDuplicateEntries.Set(float64(1))
	}

	login.MStatMixedCasedUsers.Set(float64(stats.MixedCasedUsers))
	return stats, nil
}

func (s *AuthInfoStore) CollectLoginStats(ctx context.Context) (map[string]interface{}, error) {
	m := map[string]interface{}{}

	loginStats, err := s.GetLoginStats(ctx)
	if err != nil {
		s.logger.Error("Failed to get login stats", "error", err)
		return nil, err
	}
	m["stats.users.duplicate_user_entries"] = loginStats.DuplicateUserEntries
	if loginStats.DuplicateUserEntries > 0 {
		m["stats.users.has_duplicate_user_entries"] = 1
	} else {
		m["stats.users.has_duplicate_user_entries"] = 0
	}
	m["stats.users.mixed_cased_users"] = loginStats.MixedCasedUsers

	return m, nil
}

func (s *AuthInfoStore) duplicateUserEntriesSQL(ctx context.Context) string {
	userDialect := s.sqlStore.GetDialect().Quote("user")
	// this query counts how many users have the same login or email.
	// which might be confusing, but gives a good indication
	// we want this query to not require too much cpu
	sqlQuery := `SELECT
		(SELECT login from ` + userDialect + ` WHERE (LOWER(login) = LOWER(u.login)) AND (login != u.login)) AS dup_login,
		(SELECT email from ` + userDialect + ` WHERE (LOWER(email) = LOWER(u.email)) AND (email != u.email)) AS dup_email
	FROM ` + userDialect + ` AS u`
	return sqlQuery
}

func (s *AuthInfoStore) mixedCasedUsers(ctx context.Context) string {
	userDialect := db.DB.GetDialect(s.sqlStore).Quote("user")
	// this query counts how many users have upper case and lower case login or emails.
	// why
	// users login via IDP or service providers get upper cased domains at times :shrug:
	sqlQuery := `SELECT login, email FROM ` + userDialect + ` WHERE (LOWER(login) != login OR lower(email) != email)`
	return sqlQuery
}
