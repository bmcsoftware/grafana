package sqlstore

import (
	"context"
	"fmt"
	"html"

	"github.com/grafana/grafana/pkg/models"
)

func (ss *SQLStore) GetReportListJobQueue(ctx context.Context, query *models.GetReportListJobQueue) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		results := make([]*models.RSReportInfo, 0)
		rawSql := fmt.Sprintf(`SELECT r.id, map.job_id, r.name, r.report_type, r.schedule_type, r.enabled, d.title, d.uid,
		r.created_at, r.updated_at, r.next_at, r.last_at, u.name as created_by, u.id as user_id,
		t.count_runs, f.count_fail, s.description as last_fail, j.file_key, j.deleted,
		CASE WHEN last_at = 0 THEN 'none' WHEN s.value = -1 THEN 'fail' ELSE 'success' END as state
		FROM (
			SELECT last_runs.report_id, last_runs.job_id, max(job_status.id) as status_id
		FROM job_queue j
		INNER JOIN (
			SELECT max(j.id) as job_id, j.report_data_id as report_id
			FROM job_queue j
			GROUP BY 2
		) last_runs ON last_runs.job_id = j.id
		LEFT JOIN job_status ON job_id = job_status.job_queue_id
		GROUP BY 1,2
		) map
		LEFT JOIN report_data r ON r.id = map.report_id
		LEFT JOIN job_queue j ON j.id = map.job_id
		LEFT JOIN job_status s ON s.id = map.status_id AND s.value = -1
		LEFT JOIN "user" u ON u.id = r.user_id
		LEFT JOIN dashboard d ON d.id = r.dashboard_id
		LEFT JOIN (
			SELECT r.id, count(*) as count_fail
			FROM job_status s
			LEFT JOIN job_queue q ON s.job_queue_id = q.id
			LEFT JOIN report_data r ON q.report_data_id = r.id
			WHERE s.value != 1
			GROUP BY 1
		) f ON f.id = r.id
		LEFT JOIN (
			SELECT q.report_data_id as id, count(*) as count_runs
		FROM job_queue q
		GROUP BY 1
		) t ON t.id = r.id
		WHERE r.name ILIKE '%v'
		AND r.org_id = %d`, "%"+html.EscapeString(query.Query)+"%", query.OrgID)
		err := dbSession.SQL(rawSql).
			Find(&results)
		if err != nil {
			return err
		}

		for i, result := range results {
			results[i].Deleted = result.Deleted || result.FileKey == ""
		}
		query.Result = results
		return nil
	})
}

func (ss *SQLStore) GetRSJobQueueByJobId(ctx context.Context, query *models.GetRSJobQueueByJobId) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		queue := &models.RSJobQueue{}

		_, err := dbSession.Table("job_queue").
			Join("RIGHT", "report_data", "report_data.id = job_queue.report_data_id").
			Where("report_data.org_id = ?", query.OrgID).
			Where("job_queue.id = ?", query.JobId).
			Get(queue)
		if err != nil {
			return err
		}

		queue.Deleted = queue.Deleted || queue.FileKey == ""

		status := make([]*models.RSJobStatus, 0)
		err = dbSession.Table("job_status").
			Where("job_status.job_queue_id = ?", queue.Id).
			OrderBy("job_status.description ASC").
			Find(&status)
		if err != nil {
			return err
		}
		job := &models.GetRSJobQueue{}
		job.Queue = queue
		job.Status = status

		query.Result = job
		return nil
	})
}
