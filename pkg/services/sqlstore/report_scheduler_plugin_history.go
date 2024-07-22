package sqlstore

import (
	"context"
	"fmt"
	"github.com/grafana/grafana/pkg/bmc"
)

func (ss *SQLStore) GetReportHistory(ctx context.Context, query *bmc.GetReportHistory) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {

		nonAdminCondition := ""
		if !query.IsAdmin {
			nonAdminCondition = fmt.Sprintf("AND user_id = %d", query.UserID)
		}

		rawSQL := fmt.Sprintf(`SELECT job.id, job.started_at, status.description, job.elapsed_time,
		CASE
			WHEN value = -1 THEN 'Failed'
		  	WHEN description LIKE '3.%%' THEN 'Success'
			WHEN started_at + '1h' < NOW() THEN 'Failed'
			WHEN description IS NOT NULL THEN 'Pending'
			ELSE 'Unknown' END as status,
		CASE
		  WHEN deleted=false AND file_key IS NOT NULL
		  THEN true ELSE false END as can_download
		FROM job_queue job
		LEFT JOIN (
		  SELECT job_queue_id, value, max(description) as description
		  FROM job_status
		  GROUP BY job_queue_id, value
		) status ON status.job_queue_id = job.id
		RIGHT JOIN (
		  SELECT id, user_id, org_id
		  FROM report_data
		) as report ON report.id = job.report_data_id AND org_id = %d %s
		WHERE report_data_id = %d
		ORDER BY started_at DESC
		LIMIT 10`, query.OrgID, nonAdminCondition, query.ReportID)

		if err := dbSession.SQL(rawSQL).
			Find(&query.Results); err != nil {
			return err
		}

		return nil
	})
}
