package mockstore

import (
	"context"
	"github.com/grafana/grafana/pkg/bmc"
	"xorm.io/core"

	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
	"github.com/grafana/grafana/pkg/services/sqlstore/session"
	"github.com/grafana/grafana/pkg/services/user"
)

type OrgListResponse []struct {
	OrgId    int64
	Response error
}
type SQLStoreMock struct {
	LastGetAlertsQuery      *models.GetAlertsQuery
	LastLoginAttemptCommand *models.CreateLoginAttemptCommand

	ExpectedUser                   *user.User
	ExpectedTeamsByUser            []*models.TeamDTO
	ExpectedAlert                  *models.Alert
	ExpectedSystemStats            *models.SystemStats
	ExpectedDataSourceStats        []*models.DataSourceStats
	ExpectedDataSourcesAccessStats []*models.DataSourceAccessStats
	ExpectedNotifierUsageStats     []*models.NotifierUsageStats
	ExpectedSignedInUser           *user.SignedInUser
	ExpectedLoginAttempts          int64

	ExpectedError error
}

func NewSQLStoreMock() *SQLStoreMock {
	return &SQLStoreMock{}
}

func (m *SQLStoreMock) GetAdminStats(ctx context.Context, query *models.GetAdminStatsQuery) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetAlertNotifiersUsageStats(ctx context.Context, query *models.GetAlertNotifierUsageStatsQuery) error {
	query.Result = m.ExpectedNotifierUsageStats
	return m.ExpectedError
}

func (m *SQLStoreMock) GetDataSourceStats(ctx context.Context, query *models.GetDataSourceStatsQuery) error {
	query.Result = m.ExpectedDataSourceStats
	return m.ExpectedError
}

func (m *SQLStoreMock) GetDataSourceAccessStats(ctx context.Context, query *models.GetDataSourceAccessStatsQuery) error {
	query.Result = m.ExpectedDataSourcesAccessStats
	return m.ExpectedError
}

func (m *SQLStoreMock) GetSystemStats(ctx context.Context, query *models.GetSystemStatsQuery) error {
	query.Result = m.ExpectedSystemStats
	return m.ExpectedError
}

func (m *SQLStoreMock) GetDialect() migrator.Dialect {
	return nil
}

func (m *SQLStoreMock) GetDBType() core.DbType {
	return ""
}

func (m *SQLStoreMock) CreateUser(ctx context.Context, cmd user.CreateUserCommand) (*user.User, error) {
	return nil, m.ExpectedError
}

func (m *SQLStoreMock) GetUserProfile(ctx context.Context, query *models.GetUserProfileQuery) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetSignedInUser(ctx context.Context, query *models.GetSignedInUserQuery) error {
	query.Result = m.ExpectedSignedInUser
	return m.ExpectedError
}

// BMC code - inline change
func (m *SQLStoreMock) CreateTeam(name string, email string, orgID int64, Id int64) (models.Team, error) {
	return models.Team{
		// BMC code - next line
		Id:    Id,
		Name:  name,
		Email: email,
		OrgId: orgID,
	}, nil
}

func (m *SQLStoreMock) WithDbSession(ctx context.Context, callback sqlstore.DBTransactionFunc) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) WithNewDbSession(ctx context.Context, callback sqlstore.DBTransactionFunc) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) WithTransactionalDbSession(ctx context.Context, callback sqlstore.DBTransactionFunc) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) InTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) Migrate(_ bool) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) Sync() error {
	return m.ExpectedError
}

func (m *SQLStoreMock) Reset() error {
	return m.ExpectedError
}

func (m *SQLStoreMock) Quote(value string) string {
	return ""
}

func (m *SQLStoreMock) GetDBHealthQuery(ctx context.Context, query *models.GetDBHealthQuery) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetSqlxSession() *session.SessionDB {
	return nil
}

func (m *SQLStoreMock) CreateLoginAttempt(ctx context.Context, cmd *models.CreateLoginAttemptCommand) error {
	m.LastLoginAttemptCommand = cmd
	return m.ExpectedError
}

func (m *SQLStoreMock) GetAlertById(ctx context.Context, query *models.GetAlertByIdQuery) error {
	query.Result = m.ExpectedAlert
	return m.ExpectedError
}

func (m *SQLStoreMock) GetAlertNotificationUidWithId(ctx context.Context, query *models.GetAlertNotificationUidQuery) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) DeleteOldLoginAttempts(ctx context.Context, cmd *models.DeleteOldLoginAttemptsCommand) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetAlertNotificationsWithUidToSend(ctx context.Context, query *models.GetAlertNotificationsWithUidToSendQuery) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetUserLoginAttemptCount(ctx context.Context, query *models.GetUserLoginAttemptCountQuery) error {
	query.Result = m.ExpectedLoginAttempts
	return m.ExpectedError
}

func (m *SQLStoreMock) GetAlertStatesForDashboard(ctx context.Context, query *models.GetAlertStatesForDashboardQuery) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetAllAlertQueryHandler(ctx context.Context, query *models.GetAllAlertsQuery) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetOrCreateAlertNotificationState(ctx context.Context, cmd *models.GetOrCreateNotificationStateQuery) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) HandleAlertsQuery(ctx context.Context, query *models.GetAlertsQuery) error {
	m.LastGetAlertsQuery = query
	return m.ExpectedError
}

func (m *SQLStoreMock) PauseAlert(ctx context.Context, cmd *models.PauseAlertCommand) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) PauseAllAlerts(ctx context.Context, cmd *models.PauseAllAlertCommand) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) SetAlertNotificationStateToCompleteCommand(ctx context.Context, cmd *models.SetAlertNotificationStateToCompleteCommand) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) SetAlertNotificationStateToPendingCommand(ctx context.Context, cmd *models.SetAlertNotificationStateToPendingCommand) error {
	return m.ExpectedError
}

func (m SQLStoreMock) SetAlertState(ctx context.Context, cmd *models.SetAlertStateCommand) error {
	return m.ExpectedError
}

// BMC Code - BEGIN
func (m *SQLStoreMock) GetAllReports(ctx context.Context, query *bmc.GetAllReports) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetReportByID(ctx context.Context, query *bmc.GetReportByID) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetReportJobQueue(ctx context.Context, query *bmc.GetReportJobQueue) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetAllRS(ctx context.Context, query *models.GetAll) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetRSById(ctx context.Context, query *models.GetById) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetRSByIds(ctc context.Context, query *models.GetByIds) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetRSByDashIds(ctx context.Context, query *models.GetByDashIds) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) InsertRS(ctx context.Context, query *models.InsertRS) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) UpdateRS(ctx context.Context, query *models.UpdateRS) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) DeleteRS(ctx context.Context, query *models.DeleteRS) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) DeleteRSByDashIds(ctx context.Context, query *models.DeleteRSByDashIds) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) InsertRSJobQueue(ctx context.Context, query *models.InsertRSJobQueue) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) UpdateRSJobQueue(ctx context.Context, query *models.UpdateRSJobQueue) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) InsertRSJobStatus(ctx context.Context, query *models.InsertRSJobStatus) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) EnableRS(ctx context.Context, query *models.EnableRS) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) DisableRS(ctx context.Context, query *models.DisableRS) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) ExecuteRS(dashboardService dashboards.DashboardService, ctx context.Context, query *models.GetJobById) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) RemoveOrDisableOrgSchedules(ctx context.Context, cmd *models.RemoveOrDisableOrgSchedules) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetReportOrg(ctx context.Context, query *models.GetReportTenantDetails) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) CreateOrUpdateReportOrg(ctx context.Context, query *models.CreateOrUpdateReportTenantDetails) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) DeleteReportOrg(ctx context.Context, query *models.DeleteReportTenantDetails) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) CountReportsByTenant(ctx context.Context, query *models.GetCountReportByTenant) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetReportSettings(ctx context.Context, query *models.GetReportBranding) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) SetReportSettings(ctx context.Context, query *models.SetReportBranding) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) DeleteReportSettings(ctx context.Context, query *models.DeleteReportBranding) error {
	return m.ExpectedError
}

func (m *SQLStoreMock) GetReportListJobQueue(ctx context.Context, query *models.GetReportListJobQueue) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetRSJobQueueByJobId(ctx context.Context, query *models.GetRSJobQueueByJobId) error {
	return m.ExpectedError
}
func (m *SQLStoreMock) GetJobQueuesByReportId(ctx context.Context, query *models.GetRSJobQueues) error {
	return m.ExpectedError
}

// BMC Code - END
