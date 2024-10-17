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

func (s *Service) GetDashboardsReportScheduler(ctx context.Context, dateFrom string, dateTo string, orgID int64) (usagedata.ScheduleResponse, error) {
	return s.store.GetDashboardsRepoSchedule(ctx, dateFrom, dateTo, orgID)
}

/* func (s *Service) GetDashboardHitCount(ctx context.Context, orgID int64, orgName string, startTime string, endTime string) (usagedata.DashboardHitCountsResponse, error) {
	return s.store.DashboardsHitCounts(ctx, orgID, orgName, startTime, endTime)
} */
