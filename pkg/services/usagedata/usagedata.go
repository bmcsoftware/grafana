package usagedata

import "context"

type Service interface {
	GetDashboardsUsingDeprecatedPlugins(context.Context, int64) (PluginInfoResponse, error)
	GetUserCount(context.Context, int64) (UserCountResponse, error)
	GetDashboardsReportScheduler(context.Context, string, string, int64) (ScheduleResponse, error)
	GetOrgLevelDashboardStats(context.Context, int64) (OrgLevelDashboardStatisticsResponse, error)
	GetIndividualDashboardStats(context.Context, int64, int64) (IndividualDashboardStatisticsResponse, error)
	GetDashboardHits(context.Context, string, string, int64, int64) (DashboardHitsResponse, error)
	GetDashboardLoadTimes(context.Context, string, string, int64, int64) (DashboardLoadTimesResponse, error)
}
