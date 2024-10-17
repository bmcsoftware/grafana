package usagedataimpl

import (
	"context"
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
	// DashboardsHitCounts(context.Context, int64, string, string, string) (usagedata.DashboardHitCountsResponse, error)
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

// vishaln - DRJ71-13426
/* func (ss *sqlStore) DashboardsHitCounts(ctx context.Context, orgID int64, orgName string, startTime string, endTime string) (usagedata.DashboardHitCountsResponse, error) {

	var result usagedata.DashboardHitCountsResponse

	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {

		ss.log.Info(fmt.Sprintf("Running SQL query to fetch hit counts for all dashboards in OrgID %d", orgID))

		tenantName := orgID

		rawSQL := `
		SELECT
			t4.uid as dashboard_uid,
			t1.title as dashboard_title,
			COALESCE(SUM(t2.data_delta), 0) AS sum_delta_data,
			COALESCE(t3.data_aggregate, 0) AS total_dashboard_views
		FROM
			metric_schema.grafana_bmc_hdb_api_dashboard_hit_labels t1
		LEFT JOIN
			metric_schema.grafana_bmc_hdb_api_dashboard_hit_data t2
			ON t1.id = t2.metric_id
			AND t2.collected_time BETWEEN ? AND ?
		LEFT JOIN
			metric_schema.grafana_bmc_hdb_api_dashboard_hit_aggregate t3
			ON t1.id = t3.id
		LEFT JOIN
			public.dashboard t4
			ON t1.dashboard_id = t4.id
			AND t1.tenant_id = t4.org_id
		WHERE
			t1.tenant_id = ?
		GROUP BY
			--t1.dashboard_id,
			--t4.id,
			t1.id,
			t3.data_aggregate;
		`

		err := dbSess.SQL(rawSQL, startTime, endTime, tenantName).Find(&result.Data)

		if err != nil {
			ss.log.Error(fmt.Sprintf("Error while running SQL query to fetch metric ID & hit count for all dashboards in OrgID %d", orgID))
			return err
		}

		if result.Len() == 0 {
			return usagedata.ErrNoDashboardsFound
		}
		return nil
	})
	if err != nil {
		return result, err
	}
	ss.log.Info("Ran SQL query to fetch dashboard hit count")

	return result, nil
} */
