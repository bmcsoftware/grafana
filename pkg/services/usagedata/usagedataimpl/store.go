package usagedataimpl

import (
	"context"
	"errors"
	"fmt"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
	"github.com/grafana/grafana/pkg/services/usagedata"
	"github.com/grafana/grafana/pkg/setting"
)

type store interface {
	GetDashboardsUsingDepPlugs(context.Context, int64) (usagedata.PluginInfoResponse, error)
	GetUserCountService(ctx context.Context, orgID int64) (usagedata.UserCountResponse, error)
	GetDashboardsRepoSchedule(context.Context, string, string, int64) (usagedata.ScheduleResponse, error)
	GetOrgLevelDashboardStatistics(context.Context, int64) (usagedata.OrgLevelDashboardStatisticsResponse, error)
	GetIndividualDashboardStatistics(context.Context, int64, int64) (usagedata.IndividualDashboardStatisticsResponse, error)
	GetDashboardHits(context.Context, string, string, int64, int64) (usagedata.DashboardHitsResponse, error)
	GetDashboardLoadTimes(context.Context, string, string, int64, int64) (usagedata.DashboardLoadTimesResponse, error)
}

type sqlStore struct {
	db      db.DB
	dialect migrator.Dialect
	log     log.Logger
	cfg     *setting.Cfg
}

func (ss *sqlStore) GetDashboardsUsingDepPlugs(ctx context.Context, orgID int64) (usagedata.PluginInfoResponse, error) {
	var result usagedata.PluginInfoResponse
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {

		ss.log.Info("Running SQL query to fetch all panels")

		// Raw SQL to run on the DB to fetch list of dashboards using deprecated plugins.
		rawSQL := `
		SELECT 
			title AS DashboardTitle,
			uid AS DashboardUID,			 
			(SELECT login FROM PUBLIC.user WHERE id=d.created_by) AS DashboardCreator,
			created as CreateDate,
			updated as UpdateDate,	
			CASE
				WHEN panel_element->>'type' IS NULL
				THEN (SELECT TYPE FROM library_element WHERE uid=(panel_element->'libraryPanel'->>'uid') limit 1)
				ELSE panel_element->>'type'
				END
				AS PluginType, 
			panel_element->>'title' AS PanelTitle,
			(SELECT COUNT(id) FROM report_data WHERE dashboard_id=d.id) AS NoOfReportSchedules
		FROM dashboard d,
		LATERAL jsonb_array_elements(data::jsonb->'panels') AS panel_element
		WHERE
			jsonb_typeof(data::jsonb->'panels') = 'array'	
			AND is_folder=false
			AND org_id=?
		LIMIT 25000;
		`

		err := dbSess.SQL(rawSQL, orgID).Find(&result.Data)

		if err != nil {
			ss.log.Error("Error while running SQL query to fetch all panels")
			return err
		}
		if result.Len() == 0 {
			ss.log.Error("No panels exist for the org")
			return usagedata.ErrNoDashboardsFound
		}
		return nil
	})
	if err != nil {
		return result, err
	}

	ss.log.Info("Ran SQL query to fetch all panels. Returning")

	return result, nil
}

// surghosh change
func (ss *sqlStore) GetUserCountService(ctx context.Context, orgID int64) (usagedata.UserCountResponse, error) {
	var result usagedata.UserCountResponse
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {
		ss.log.Info("Running SQL query to fetch user counts")

		rawSQL := `SELECT
						COUNT(public."user".id) AS TotalUsers,
						COUNT(public."user".id) FILTER (WHERE public."user".last_seen_at >= NOW () - INTERVAL '30 days') AS ActiveUsers
					FROM
						public."user"
					WHERE
						public."user".is_disabled IS NOT TRUE
						AND public."user".org_id = ?;`
		err := dbSess.SQL(rawSQL, orgID).Find(&result.Data)
		if err != nil {
			ss.log.Error("Error while running SQL query to fetch user counts")
			return err
		}
		if result.Len() == 0 {
			ss.log.Error("Org not found")
			return usagedata.ErrNoUserCountsFound
		}

		return nil
	})
	if err != nil {
		return result, err
	}
	ss.log.Info("Ran all Queries, Returning")
	return result, nil
}

// purva change
func (ss *sqlStore) GetDashboardsRepoSchedule(ctx context.Context, fromTime string, toTime string, orgID int64) (usagedata.ScheduleResponse, error) {
	var result usagedata.ScheduleResponse
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {

		ss.log.Info(fmt.Sprintf("Running SQL query to fetch report scheduler info between %v - %v", fromTime, toTime))

		// Raw SQL to run on the DB to fetch list of dashboards using deprecated plugins.
		rawSQL := `
		SELECT 
			r.id AS ReportId,
			r.enabled AS IsActive,
			r.name AS ScheduleName,
			(SELECT login FROM public.user WHERE id=r.user_id limit 1) AS Creator,	
			(SELECT title from dashboard where id=dashboard_id limit 1) AS DashboardName,
			(SELECT uid from dashboard where id=dashboard_id limit 1) AS DashboardUid,
			created_at AS Created,
			updated_at AS LastUpdated,
			report_type AS ReportType,
			schedule_type AS ScheduleType,
			SUM(CASE WHEN js.Status = 1 THEN 1 ELSE 0 END) AS PassCount,
			SUM(CASE WHEN js.Status = -1 THEN 1 ELSE 0 END) AS FailCount,
			COUNT(js.ExecutionId) AS TotalExecutionCount
		FROM report_data r 
		LEFT JOIN (
		SELECT 
			j.Id As ExecutionId,
			j.report_data_id AS ScheduleId,
			s.value AS Status 
		FROM job_queue j LEFT JOIN job_status s ON j.id=s.job_queue_id 
		WHERE 
			j.started_at >=? and j.started_at <= ? ) js ON r.id=js.ScheduleId 
		WHERE 
			org_id=?
		GROUP BY ReportId
		LIMIT 1000;
		`

		err := dbSess.SQL(rawSQL, fromTime, toTime, orgID).Find(&result.Data)

		if err != nil {
			ss.log.Error(fmt.Sprintf("Error while running SQL query to fetch report scheduler info between %v - %v", fromTime, toTime))
			return err
		}
		if result.Len() == 0 {
			ss.log.Error(fmt.Sprintf("No scheduled reports found between %v - %v", fromTime, toTime))
			return usagedata.ErrNoScheduledReportsFound
		}
		return nil
	})
	if err != nil {
		return result, err
	}
	ss.log.Info("Ran SQL query to fetch scheduler info. Returning")
	return result, nil
}

func (ss *sqlStore) GetOrgLevelDashboardStatistics(ctx context.Context, orgID int64) (usagedata.OrgLevelDashboardStatisticsResponse, error) {
	var result usagedata.OrgLevelDashboardStatisticsResponse
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {

		ss.log.Info(fmt.Sprintf("Running SQL query to fetch org level dashboard statistics for OrgID %d", orgID))

		rawSQL := `
		SELECT
			t4.id as dashboard_id,
			t4.uid dashboard_uid,
			t4.title dashboard_title,
			COALESCE(t11.avg_load_time, 0) as avg_load_time,
			COALESCE(t5.data_aggregate, 0) as total_views,
			t9.collected_time as last_accessed_time
		FROM
			(
				SELECT
					t1.id as d_hit_metric,
					t2.id as d_loadtime_metric,
					COALESCE(t1.dashboard_id, t2.dashboard_id) as dashboard_id,
					COALESCE(t1.tenant_id, t2.tenant_id) as tenant_id
				FROM
					metric_schema.grafana_bmc_hdb_api_dashboard_hit_labels t1
					FULL OUTER JOIN metric_schema.grafana_bmc_hdb_api_dashboard_loadtime_labels t2 ON t1.dashboard_id = t2.dashboard_id
					AND t1.tenant_id = t2.tenant_id
			) as t3
			RIGHT JOIN dashboard t4
			ON t4.id = t3.dashboard_id
			AND t4.org_id = t3.tenant_id
			-- We have list of all available dashboards with their metric labels at this point. Right joining with dashboards table takes care of deleted dashboards.
			LEFT JOIN metric_schema.grafana_bmc_hdb_api_dashboard_hit_aggregate t5 ON t5.metric_id = t3.d_hit_metric
			-- Have dashboards with their total views now
			LEFT JOIN (
				SELECT DISTINCT
					ON (t6.metric_id) t6.metric_id,
					t6.collected_time
				FROM
					metric_schema.grafana_bmc_hdb_api_dashboard_hit_data t6
				ORDER BY
					t6.metric_id,
					t6.collected_time DESC
			) t9 ON t9.metric_id = t3.d_hit_metric
			-- Have dashboards with their last accessed time and their time filtered views at this point
			LEFT JOIN (
				SELECT
					t10.metric_id,
					AVG(t10.data_delta) as avg_load_time
				FROM
					metric_schema.grafana_bmc_hdb_api_dashboard_loadtime_data t10
				GROUP BY
					metric_id
			) t11 ON t11.metric_id = t3.d_loadtime_metric
			-- Have dashboards with their average load times at this point
			WHERE t4.org_id = ?
			AND t4.is_folder = false
		`

		err := dbSess.SQL(rawSQL, orgID).Find(&result.Data)

		if err != nil {
			ss.log.Error(fmt.Sprintf("Error while running SQL query to fetch org level dashboard statistics for OrgID %d", orgID))
			return err
		}
		if result.Len() == 0 {
			ss.log.Error(fmt.Sprintf("No dashboards found with usage data in OrgID %d", orgID))
			return usagedata.ErrNoDashboardsWithUsageDataFound
		}
		return nil
	})
	if err != nil {
		return result, err
	}
	ss.log.Info("Ran SQL query to fetch org level dashboard stats. Returning")
	return result, nil
}

func (ss *sqlStore) GetIndividualDashboardStatistics(ctx context.Context, dashboardID int64, orgID int64) (usagedata.IndividualDashboardStatisticsResponse, error) {
	var result usagedata.IndividualDashboardStatisticsResponse
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {

		ss.log.Info(fmt.Sprintf("Running SQL query to fetch stats for dashboard %d in OrgID %d", dashboardID, orgID))

		rawSQL := `
		SELECT
			t4.id as dashboard_id,
			t4.uid dashboard_uid,
			t4.title dashboard_title,
			COALESCE(t11.avg_load_time, 0) as avg_load_time,
			COALESCE(t5.data_aggregate, 0) as total_views,
			t9.collected_time as last_accessed_time
		FROM
			(
				SELECT
					t1.id as d_hit_metric,
					t2.id as d_loadtime_metric,
					COALESCE(t1.dashboard_id, t2.dashboard_id) as dashboard_id,
					COALESCE(t1.tenant_id, t2.tenant_id) as tenant_id
				FROM
					metric_schema.grafana_bmc_hdb_api_dashboard_hit_labels t1
					FULL OUTER JOIN metric_schema.grafana_bmc_hdb_api_dashboard_loadtime_labels t2 ON t1.dashboard_id = t2.dashboard_id
					AND t1.tenant_id = t2.tenant_id
			) as t3
			RIGHT JOIN dashboard t4
			ON t4.id = t3.dashboard_id
			AND t4.org_id = t3.tenant_id
			-- We have list of all available dashboards with their metric labels at this point. Inner joining with dashboards table takes care of deleted dashboards.
			LEFT JOIN metric_schema.grafana_bmc_hdb_api_dashboard_hit_aggregate t5 ON t5.metric_id = t3.d_hit_metric
			-- Have dashboards with their total views now
			LEFT JOIN (
				SELECT DISTINCT
					ON (t6.metric_id) t6.metric_id,
					t6.collected_time
				FROM
					metric_schema.grafana_bmc_hdb_api_dashboard_hit_data t6
				ORDER BY
					t6.metric_id,
					t6.collected_time DESC
			) t9 ON t9.metric_id = t3.d_hit_metric
			-- Have dashboards with their last accessed time and their time filtered views at this point
			LEFT JOIN (
				SELECT
					t10.metric_id,
					AVG(t10.data_delta) as avg_load_time
				FROM
					metric_schema.grafana_bmc_hdb_api_dashboard_loadtime_data t10
				GROUP BY
					metric_id
			) t11 ON t11.metric_id = t3.d_loadtime_metric
			-- Have dashboards with their average load times at this point
			WHERE t4.id = ?
			AND t4.org_id = ?
		`

		err := dbSess.SQL(rawSQL, dashboardID, orgID).Find(&result.Data)

		if err != nil {
			ss.log.Error(fmt.Sprintf("Error while running SQL query to fetch stats for dashboard %d in OrgID - %d", dashboardID, orgID))
			return err
		}
		if result.Len() == 0 {
			errMsg := fmt.Sprintf("No stats for dashboard %d in OrgID %d", dashboardID, orgID)
			ss.log.Error(errMsg)
			return errors.New(errMsg)
		}
		return nil
	})
	if err != nil {
		return result, err
	}

	ss.log.Info(fmt.Sprintf("Ran query to fetch stats for dashboard %d in OrgID %d", dashboardID, orgID))
	return result, nil
}

func (ss *sqlStore) GetDashboardHits(ctx context.Context, fromTime string, toTime string, dashboardID int64, orgID int64) (usagedata.DashboardHitsResponse, error) {
	var result usagedata.DashboardHitsResponse
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {

		ss.log.Info(fmt.Sprintf("Running SQL query to fetch hit count for dashboard %d in OrgID %d", dashboardID, orgID))

		rawSQL := `
		SELECT
			t2.data_delta as hits,
			t2.collected_time as collected_time
		FROM
			metric_schema.grafana_bmc_hdb_api_dashboard_hit_data t2
		WHERE
			t2.metric_id = (
				SELECT
					t1.id
				FROM
					metric_schema.grafana_bmc_hdb_api_dashboard_hit_labels t1
				where
					t1.dashboard_id = ?
					AND t1.tenant_id = ?
			)
			AND t2.collected_time BETWEEN ? AND ?
			`

		err := dbSess.SQL(rawSQL, dashboardID, orgID, fromTime, toTime).Find(&result.Data)

		if err != nil {
			ss.log.Error(fmt.Sprintf("Error while running SQL query to fetch hit count for dashboard %d in OrgID %d", dashboardID, orgID))
			return err
		}
		return nil
	})
	if err != nil {
		return result, err
	}

	ss.log.Info(fmt.Sprintf("Ran query to fetch hit count for dashboard %d in OrgID %d", dashboardID, orgID))
	return result, nil
}

func (ss *sqlStore) GetDashboardLoadTimes(ctx context.Context, fromTime string, toTime string, dashboardID int64, orgID int64) (usagedata.DashboardLoadTimesResponse, error) {
	var result usagedata.DashboardLoadTimesResponse
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {

		ss.log.Info(fmt.Sprintf("Running SQL query to fetch load time for dashboard %d in OrgID %d", dashboardID, orgID))

		rawSQL := `
		SELECT
			t2.data_delta as load_time,
			t2.collected_time as collected_time
		FROM
			metric_schema.grafana_bmc_hdb_api_dashboard_loadtime_data t2
		WHERE
			t2.metric_id = (
				SELECT
					t1.id
				FROM
					metric_schema.grafana_bmc_hdb_api_dashboard_loadtime_labels t1
				where
					t1.dashboard_id = ?
					AND t1.tenant_id = ?
			)
			AND t2.collected_time BETWEEN ? AND ?
			`

		err := dbSess.SQL(rawSQL, dashboardID, orgID, fromTime, toTime).Find(&result.Data)

		if err != nil {
			ss.log.Error(fmt.Sprintf("Error while running SQL query to fetch load time for dashboard %d in OrgID %d", dashboardID, orgID))
			return err
		}
		return nil
	})
	if err != nil {
		return result, err
	}

	ss.log.Info(fmt.Sprintf("Ran query to fetch load time for dashboard %d in OrgID %d", dashboardID, orgID))
	return result, nil

}
