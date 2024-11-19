package usagedataimpl

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/usagedata"
	"github.com/grafana/grafana/pkg/setting"
)

type Service struct {
	store store
	cfg   *setting.Cfg
	log   log.Logger
}

func ProvideService(db db.DB, cfg *setting.Cfg) (usagedata.Service, error) {
	log := log.New("usagedata service")
	s := &Service{
		store: &sqlStore{
			db:      db,
			dialect: db.GetDialect(),
			log:     log,
			cfg:     cfg,
		},
		cfg: cfg,
		log: log,
	}

	return s, nil
}

func (s *Service) GetDashboardsUsingDeprecatedPlugins(ctx context.Context, orgID int64) (usagedata.PluginInfoResponse, error) {
	return s.store.GetDashboardsUsingDepPlugs(ctx, orgID)
}

func (s *Service) GetUserCount(ctx context.Context, orgId int64) (usagedata.UserCountResponse, error) {
	return s.store.GetUserCountService(ctx, orgId)
}

func (s *Service) GetDashboardsReportScheduler(ctx context.Context, fromTime string, toTime string, orgID int64) (usagedata.ScheduleResponse, error) {
	return s.store.GetDashboardsRepoSchedule(ctx, fromTime, toTime, orgID)
}

func (s *Service) GetOrgLevelDashboardStats(ctx context.Context, orgID int64) (usagedata.OrgLevelDashboardStatisticsResponse, error) {
	return s.store.GetOrgLevelDashboardStatistics(ctx, orgID)
}

func (s *Service) GetIndividualDashboardStats(ctx context.Context, dashboardID int64, orgID int64) (usagedata.IndividualDashboardStatisticsResponse, error) {
	return s.store.GetIndividualDashboardStatistics(ctx, dashboardID, orgID)
}

func (s *Service) GetDashboardHits(ctx context.Context, fromTime string, toTime string, dashboardID int64, orgID int64) (usagedata.DashboardHitsResponse, error) {
	return s.store.GetDashboardHits(ctx, fromTime, toTime, dashboardID, orgID)
}

func (s *Service) GetDashboardLoadTimes(ctx context.Context, fromTime string, toTime string, dashboardID int64, orgID int64) (usagedata.DashboardLoadTimesResponse, error) {
	return s.store.GetDashboardLoadTimes(ctx, fromTime, toTime, dashboardID, orgID)
}

