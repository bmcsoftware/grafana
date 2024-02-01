package sqlstore

import (
	"context"
	"github.com/grafana/grafana/pkg/bmc"
	"xorm.io/core"

	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
	"github.com/grafana/grafana/pkg/services/sqlstore/session"
	"github.com/grafana/grafana/pkg/services/user"
)

type Store interface {
	GetAdminStats(ctx context.Context, query *models.GetAdminStatsQuery) error
	GetAlertNotifiersUsageStats(ctx context.Context, query *models.GetAlertNotifierUsageStatsQuery) error
	GetDataSourceStats(ctx context.Context, query *models.GetDataSourceStatsQuery) error
	GetDataSourceAccessStats(ctx context.Context, query *models.GetDataSourceAccessStatsQuery) error
	GetDialect() migrator.Dialect
	GetDBType() core.DbType
	GetSystemStats(ctx context.Context, query *models.GetSystemStatsQuery) error
	CreateUser(ctx context.Context, cmd user.CreateUserCommand) (*user.User, error)
	GetSignedInUser(ctx context.Context, query *models.GetSignedInUserQuery) error
	WithDbSession(ctx context.Context, callback DBTransactionFunc) error
	WithNewDbSession(ctx context.Context, callback DBTransactionFunc) error
	WithTransactionalDbSession(ctx context.Context, callback DBTransactionFunc) error
	InTransaction(ctx context.Context, fn func(ctx context.Context) error) error
	Migrate(bool) error
	Sync() error
	Reset() error
	Quote(value string) string
	GetDBHealthQuery(ctx context.Context, query *models.GetDBHealthQuery) error
	GetSqlxSession() *session.SessionDB
	// BMC code - BEGIN

	GetAllReports(ctx context.Context, query *bmc.GetAllReports) error
	GetReportByID(ctx context.Context, query *bmc.GetReportByID) error
	GetReportJobQueue(ctx context.Context, query *bmc.GetReportJobQueue) error

	GetAllRS(ctx context.Context, query *models.GetAll) error
	GetRSById(ctx context.Context, query *models.GetById) error
	GetRSByIds(ctx context.Context, query *models.GetByIds) error
	GetRSByDashIds(ctx context.Context, query *models.GetByDashIds) error
	InsertRS(ctx context.Context, query *models.InsertRS) error
	UpdateRS(ctx context.Context, query *models.UpdateRS) error
	DeleteRS(ctx context.Context, query *models.DeleteRS) error
	DeleteRSByDashIds(ctx context.Context, query *models.DeleteRSByDashIds) error
	InsertRSJobQueue(ctx context.Context, query *models.InsertRSJobQueue) error
	UpdateRSJobQueue(ctx context.Context, query *models.UpdateRSJobQueue) error
	InsertRSJobStatus(ctx context.Context, query *models.InsertRSJobStatus) error
	EnableRS(ctx context.Context, query *models.EnableRS) error
	DisableRS(ctx context.Context, query *models.DisableRS) error
	ExecuteRS(dashboardService dashboards.DashboardService, ctx context.Context, query *models.GetJobById) error
	RemoveOrDisableOrgSchedules(ctx context.Context, cmd *models.RemoveOrDisableOrgSchedules) error
	GetReportOrg(ctx context.Context, query *models.GetReportTenantDetails) error
	CreateOrUpdateReportOrg(ctx context.Context, query *models.CreateOrUpdateReportTenantDetails) error
	DeleteReportOrg(ctx context.Context, query *models.DeleteReportTenantDetails) error
	CountReportsByTenant(ctx context.Context, query *models.GetCountReportByTenant) error

	GetReportSettings(ctx context.Context, query *models.GetReportBranding) error
	SetReportSettings(ctx context.Context, query *models.SetReportBranding) error
	DeleteReportSettings(ctx context.Context, query *models.DeleteReportBranding) error

	GetReportListJobQueue(ctx context.Context, query *models.GetReportListJobQueue) error
	GetRSJobQueueByJobId(ctx context.Context, query *models.GetRSJobQueueByJobId) error
	GetReportHistory(ctx context.Context, query *bmc.GetReportHistory) error

	GetFTPConfig(ctx context.Context, query *models.GetFTPConfig) error
	SetFTPConfig(ctx context.Context, query *models.SetFTPConfigCmd) error
	ModifyFTPConfig(ctx context.Context, query *models.ModifyFTPConfigCmd) error

	GetFeatureStatus(ctx context.Context, query *models.GetFeatureStatus) error
	SetFeatureStatus(ctx context.Context, query *models.SetFeatureStatus) error
	IsFeatureEnabled(ctx context.Context, orgId int64, featureName string) bool
	GetCalculatedField(ctx context.Context, query *models.GetCalculatedField) error
	GetCustomConfiguration(ctx context.Context, query *models.GetCustomConfiguration) error
	SetCustomConfiguration(ctx context.Context, query *models.SetCustomConfiguration) error
	ResetCustomConfiguration(ctx context.Context, query *models.RefreshCustomConfiguration) error
	GetCalculatedFields(ctx context.Context, query *models.GetCalculatedFields) error
	CheckForField(ctx context.Context, name string) error
	CreateCalculatedField(ctx context.Context, cmd *models.CreateCalcFieldCmd) error
	GetDashboardsToCalcDelete(ctx context.Context, cmd *models.DeleteCalcFieldsByIds) error
	DeletelatedFields(ctx context.Context, cmd *models.DeleteCalcFieldsByIds) error
	ModifyCalcFields(ctx context.Context, cmd *models.ModifyCalcFieldCmd) error
	GetDashboardsToCalcUpdate(ctx context.Context, fieldName string, orgId int64, module string, sqlQuery string, name string) error
	//
	// UpdateTeamMembership(ctx *models.ReqContext, jwtTokenDetails *authz.UserInfo)
	//
	// CheckIfUserSynced(rCtx *models.ReqContext)
	// RemoveFromTeam(ctx *models.ReqContext, jwtTokenDetails *authz.UserInfo)

	GetDashPersonalization(ctx context.Context, query *models.GetCustomDashPersonalization) error
	SaveDashPersonalization(ctx context.Context, query *models.SaveCustomDashPersonalization) error
	DeleteDashPersonalization(ctx context.Context, query *models.DeleteCustomDashPersonalization) error
	// BMC code - END
}
