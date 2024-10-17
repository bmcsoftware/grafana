package usagedata

import "context"

type Service interface {
	GetDashboardsUsingDeprecatedPlugins(context.Context, int64) (PluginInfoResponse, error)
	GetUserCount(context.Context, int64) (UserCountResponse, error)
	GetDashboardsReportScheduler(context.Context, string, string, int64) (ScheduleResponse, error)
	// GetDashboardHitCount(context.Context, int64, string, string, string) (DashboardHitCountsResponse, error)
}
