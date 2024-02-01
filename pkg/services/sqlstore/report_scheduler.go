package sqlstore

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/util"
)

func (ss *SQLStore) GetAllRS(ctx context.Context, query *models.GetAll) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		results := make([]*models.RSData, 0)

		sess := dbSession.Table("report_data").
			Join("LEFT", "report_scheduler", "report_scheduler.id = report_data.report_scheduler_id").
			Where("report_data.user_id = ?", query.UserId).
			Where("report_data.org_id = ?", query.OrgId).
			Where("report_data.name ILIKE ?", "%"+query.QueryName+"%").
			OrderBy("report_data.name")

		if query.QueryDashId != 0 {
			sess = sess.Where("report_data.dashboard_id = ?", query.QueryDashId)
		}

		if err := sess.
			Find(&results); err != nil {
			return err
		}

		query.Result = results
		return nil
	})
}
func (ss *SQLStore) GetRSById(ctx context.Context, query *models.GetById) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		results := make([]*models.RSData, 0)
		queryString := dbSession.Table("report_data").
			Join("LEFT", "report_scheduler", "report_scheduler.id = report_data.report_scheduler_id").
			Where("report_data.org_id = ?", query.OrgId).
			Where("report_data.id = ?", query.Id)

		if !query.IsOrgAdmin {
			queryString = queryString.Where("report_data.user_id = ?", query.UserId)
		}

		if err := queryString.Find(&results); err != nil {
			return err
		}

		if len(results) == 0 {
			return models.ErrReportSchedulerNotFound
		}

		query.Result = results[0]
		return nil
	})
}
func (ss *SQLStore) GetRSByIds(ctx context.Context, query *models.GetByIds) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		results := make([]*models.RSData, 0)

		queryString := dbSession.Table("report_data").
			Join("LEFT", "report_scheduler", "report_scheduler.id = report_data.report_scheduler_id").
			Where("report_data.org_id = ?", query.OrgId).
			In("report_data.id", query.Ids)

		if !query.IsOrgAdmin {
			queryString = queryString.Where("report_data.user_id = ?", query.UserId)
		}

		if err := queryString.Find(&results); err != nil {
			return err
		}

		if len(results) == 0 {
			return models.ErrReportSchedulerNotFound
		}

		query.Result = results
		return nil
	})
}
func (ss *SQLStore) GetRSByDashIds(ctx context.Context, query *models.GetByDashIds) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		results := make([]*models.RSData, 0)
		if err := dbSession.Table("report_data").
			Join("LEFT", "report_scheduler", "report_scheduler.id = report_data.report_scheduler_id").
			In("report_data.dashboard_id", query.DashIds).
			Where("report_data.user_id = ?", query.UserId).
			Where("report_data.org_id = ?", query.OrgId).
			OrderBy("report_data.name").
			Find(&results); err != nil {
			return err
		}

		query.Result = results
		return nil
	})
}

func (ss *SQLStore) InsertRS(ctx context.Context, query *models.InsertRS) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		// Check if name exists
		if err := checkIfNameExists(sess, query.Data.Name, query.Data.OrgId, query.Data.UserId, query.Data.DashboardId); err != nil {
			return err
		}

		if err := insertScheduler(sess, query); err != nil {
			return err
			//return errors.New("error at report scheduler insertion")
		}
		if err := insertRSData(sess, query); err != nil {
			return err
			//return errors.New("error at report data insertion")
		}

		return nil
	})
}
func (ss *SQLStore) UpdateRS(ctx context.Context, query *models.UpdateRS) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		// Query the report by Id to know its name
		// Then compare the old name with the updated
		// name from queryParams if the condition is valid
		// that means it is required to check if the name
		// exists already or not
		selectOne := models.GetById{
			UserId:     query.UserId,
			OrgId:      query.Data.OrgId,
			Id:         query.Data.Id,
			IsOrgAdmin: query.IsOrgAdmin,
		}
		if err := ss.GetRSById(ctx, &selectOne); err != nil {
			return err
		}
		if query.Data.DashboardId != selectOne.Result.DashboardId {
			return models.ErrReportEditFailed
		}
		if query.Data.Name != selectOne.Result.Name {
			existing := models.RSData{}
			queryString := sess.Table("report_data").
				Select("name").
				Where("report_data.name = ?", query.Data.Name).
				Where("report_data.dashboard_id = ? ", query.Data.DashboardId)
			if !query.IsOrgAdmin {
				queryString = queryString.Where("report_data.user_id = ?", query.UserId)
			}
			has, _ := queryString.Get(&existing)
			if has {
				return models.ErrReportSchedulerNameExists
			}
		}

		query.Scheduler.Id = selectOne.Result.RSchedulerId
		if err := updateScheduler(sess, query); err != nil {
			return err
		}
		if err := updateRSData(sess, query); err != nil {
			return err
		}

		return nil

	})
}
func (ss *SQLStore) DeleteRS(ctx context.Context, query *models.DeleteRS) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		for _, Id := range query.Ids {
			report := &models.GetById{
				UserId:     query.UserId,
				OrgId:      query.OrgId,
				Id:         Id,
				IsOrgAdmin: query.IsOrgAdmin,
			}
			if err := ss.GetRSById(ctx, report); err != nil {
				return err
			}

			if err := deleteById(sess, "report_data", report.Result.Id); err != nil {
				return err
			}
			if err := deleteById(sess, "report_scheduler", report.Result.RSchedulerId); err != nil {
				return err
			}
		}
		return nil
	})
}

// Todo: should add delete on cascade if dashboard is deleted.
func (ss *SQLStore) DeleteRSByDashIds(ctx context.Context, query *models.DeleteRSByDashIds) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		reports := &models.GetByDashIds{
			UserId:  query.UserId,
			OrgId:   query.OrgId,
			DashIds: query.Ids,
		}
		if err := ss.GetRSByDashIds(ctx, reports); err != nil {
			return err
		}

		for _, report := range reports.Result {
			if err := deleteById(sess, "report_data", report.Id); err != nil {
				return err
			}
			if err := deleteById(sess, "report_scheduler", report.RSchedulerId); err != nil {
				return err
			}
		}
		return nil
	})
}

func (ss *SQLStore) InsertRSJobQueue(ctx context.Context, query *models.InsertRSJobQueue) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		if _, err := sess.Table("job_queue").
			Insert(query); err != nil {
			return err
		}
		return nil
	})
}
func (ss *SQLStore) UpdateRSJobQueue(ctx context.Context, query *models.UpdateRSJobQueue) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		if _, err := sess.Table("job_queue").
			Where("job_queue.id = ?", query.Id).
			Update(query); err != nil {
			return err
		}
		return nil
	})
}
func (ss *SQLStore) InsertRSJobStatus(ctx context.Context, query *models.InsertRSJobStatus) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		if _, err := sess.Table("job_status").
			Insert(query); err != nil {
			return err
		}
		return nil
	})
}

func (ss *SQLStore) EnableRS(ctx context.Context, query *models.EnableRS) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {

		if len(query.Ids) == 0 {
			return models.ErrReportSchedulerListEmpty
		}
		reports := models.GetByIds{
			UserId:     query.UserId,
			OrgId:      query.OrgId,
			Ids:        query.Ids,
			IsOrgAdmin: query.IsOrgAdmin,
		}
		if err := ss.GetRSByIds(ctx, &reports); err != nil {
			return err
		}

		for _, report := range reports.Result {
			nextAt, _ := util.GetNextAt(report.RScheduler.Cron, report.RScheduler.Timezone)
			update := struct {
				Enabled   bool
				NextAt    int64
				UpdatedAt time.Time
			}{
				Enabled:   true,
				NextAt:    nextAt.Unix(),
				UpdatedAt: time.Now().UTC(),
			}

			QueryString := sess.Table("report_data").
				Where("report_data.id = ?", report.Id).
				UseBool("enabled")

			if !query.IsOrgAdmin {
				QueryString = QueryString.Where("report_data.user_id = ?", query.UserId)
			}
			if _, err := QueryString.Update(&update); err != nil {
				return err
			}
		}

		return nil
	})
}
func (ss *SQLStore) DisableRS(ctx context.Context, query *models.DisableRS) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {

		if len(query.Ids) == 0 {
			return models.ErrReportSchedulerListEmpty
		}

		update := struct{ Enabled bool }{Enabled: false}
		queryString := sess.Table("report_data").
			Where("report_data.org_id = ?", query.OrgId).
			In("report_data.id", query.Ids).
			UseBool("enabled")

		if !query.IsOrgAdmin {
			queryString = queryString.Where("report_data.user_id = ?", query.UserId)
		}
		if _, err := queryString.Update(&update); err != nil {
			return err
		}
		return nil
	})
}
func (ss *SQLStore) ExecuteRS(dashboardService dashboards.DashboardService, ctx context.Context, query *models.GetJobById) error {
	report := &models.GetById{
		UserId:     query.UserId,
		OrgId:      query.OrgId,
		Id:         query.Id,
		IsOrgAdmin: query.IsOrgAdmin,
	}
	err := ss.GetRSById(ctx, report)
	if err != nil {
		return err
	}

	dashQuery := &dashboards.GetDashboardQuery{
		ID:    report.Result.DashboardId,
		OrgID: report.Result.OrgId,
	}
	dash, err := dashboardService.GetDashboard(ctx, dashQuery)
	if err != nil {
		return err
	}

	if report.Result.TimeRange == "" {
		timeRange, err := dash.Data.Get("time").Get("from").String()
		if err != nil {
			return err
		}
		report.Result.TimeRange = timeRange
	}
	result := report.Result
	query.Result = &models.ExecuteRS{
		Id:           result.Id,
		Name:         result.Name,
		Uid:          dash.UID,
		DashName:     dash.Title,
		NextAt:       result.NextAt.Int64,
		TimeRange:    result.TimeRange,
		TimeRangeTo:  result.TimeRangeTo,
		Filter:       result.Filter,
		Orientation:  result.Orientation,
		Layout:       result.Layout,
		Enabled:      result.Enabled,
		Timezone:     result.Timezone,
		Cron:         result.Cron,
		Subject:      result.Subject,
		Recipients:   result.Recipients,
		ReplyTo:      result.ReplyTo,
		Message:      result.Message,
		Description:  result.Description,
		UserId:       result.UserId,
		OrgId:        result.OrgId,
		ReportType:   result.ReportType,
		ScheduleType: result.ScheduleType,
		ServerDir:    result.ServerDir,
		HasDateStamp: result.HasDateStamp,
		HasTimeStamp: result.HasTimeStamp,
	}

	return nil
}

func checkIfNameExists(sess *DBSession, name string, orgId int64, userId int64, dashId int64) error {
	existing := models.RSData{}
	if has, _ := sess.Table("report_data").
		Select("name").
		Where("report_data.org_id = ?", orgId).
		Where("report_data.user_id = ?", userId).
		Where("report_data.name = ?", name).
		Where("report_data.dashboard_id = ? ", dashId).
		Get(&existing); has {
		return models.ErrReportSchedulerNameExists
	}
	return nil
}
func checkIfIdsExists(sess *DBSession, ids []int64, orgId int64) error {
	// In case of duplicated IDs
	check := make(map[int64]int)
	reqIds := make([]int64, 0)
	for _, val := range ids {
		check[val] = 1
	}
	for id := range check {
		reqIds = append(reqIds, id)
	}

	results := make([]*models.RSData, 0)

	if err := sess.Table("report_data").
		Select("id").
		In("report_data.id", reqIds).
		Where("report_data.org_id = ?", orgId).
		Find(&results); err != nil {
		return models.ErrReportSchedulerNameExists
	}

	if len(results) != len(reqIds) {
		return models.ErrInvalidId
	}

	//resIds := make([]int64, 0)
	//for _, result := range results {
	//	resIds = append(resIds, result.Id)
	//}

	return nil
}

func insertRSData(sess *DBSession, query *models.InsertRS) error {
	if query == nil {
		return nil
	}
	query.Data.SchedulerId = query.Scheduler.Id
	if _, err := sess.Table("report_data").
		Insert(&query.Data); err != nil {
		return err
	}
	return nil
}
func insertScheduler(sess *DBSession, query *models.InsertRS) error {
	if query == nil {
		return nil
	}

	if _, err := sess.Table("report_scheduler").
		Insert(&query.Scheduler); err != nil {
		return err
	}

	return nil
}

func updateRSData(sess *DBSession, query *models.UpdateRS) error {
	if query == nil {
		return nil
	}
	query.Data.SchedulerId = query.Scheduler.Id
	if _, err := sess.Table("report_data").
		Where("report_data.id = ?", query.Data.Id).
		Nullable("filter", "time_range").UseBool("has_date_stamp", "has_time_stamp").
		Update(&query.Data); err != nil {
		return err
	}
	return nil
}
func updateScheduler(sess *DBSession, query *models.UpdateRS) error {
	if query == nil {
		return nil
	}

	if _, err := sess.Table("report_scheduler").
		Where("report_scheduler.id = ?", query.Scheduler.Id).
		Update(&query.Scheduler); err != nil {
		return err
	}

	return nil
}
func deleteById(sess *DBSession, table string, id int64) error {
	if id == 0 {
		return models.ErrInvalidId
	}
	if _, err := sess.Table(table).Delete(struct{ Id int64 }{Id: id}); err != nil {
		return nil
	}
	return nil
}

func (ss *SQLStore) RemoveOrDisableOrgSchedules(ctx context.Context, cmd *models.RemoveOrDisableOrgSchedules) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		if cmd.IsOffboarded {
			var rawSql = "DELETE from report_scheduler where id IN (select report_scheduler_id from report_data where org_id = ?)"
			_, err := sess.Exec(rawSql, cmd.OrgId)
			if err != nil {
				return err
			}
			rawSql = "DELETE FROM report_data WHERE org_id = ?"
			_, err = sess.Exec(rawSql, cmd.OrgId)
			if err != nil {
				return err
			}
		} else {
			var rawSql = "UPDATE report_data SET enabled=false where org_id = ? "
			_, err := sess.Exec(rawSql, cmd.OrgId)
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (ss *SQLStore) GetReportOrg(ctx context.Context, query *models.GetReportTenantDetails) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		results := make([]*models.ReportTenantDetails, 0)
		if err := dbSession.Table("report_tenant_details").
			Where("report_tenant_details.org_id = ?", query.OrgId).
			Find(&results); err != nil {
			return err
		}

		if len(results) == 0 {
			return models.ErrReportTenantDetailsLimitNotFound
		}
		query.Result = results[0]
		return nil
	})
}
func (ss *SQLStore) CreateOrUpdateReportOrg(ctx context.Context, query *models.CreateOrUpdateReportTenantDetails) error {
	// If no error means has data.
	hasData := ss.GetReportOrg(ctx, &models.GetReportTenantDetails{OrgId: query.OrgId}) == nil
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		if hasData {
			var sqlUpdates []string
			if query.Limit != 0 {
				update := fmt.Sprintf("\"limit\" = %d", query.Limit)
				sqlUpdates = append(sqlUpdates, update)
			}
			if query.Type != "" {
				update := fmt.Sprintf("\"type\" = '%v'", query.Type)
				sqlUpdates = append(sqlUpdates, update)
			}
			if len(sqlUpdates) == 0 {
				return nil
			}

			columnUpdates := strings.Join(sqlUpdates, ", ")
			whereCondition := fmt.Sprintf(" WHERE org_id = %d", query.OrgId)

			sqlQuery := "UPDATE report_tenant_details set " + columnUpdates + whereCondition

			_, err := sess.Exec(sqlQuery)
			return err
		} else {
			_, err := sess.Table("report_tenant_details").Insert(query)
			return err
		}
	})
}
func (ss *SQLStore) DeleteReportOrg(ctx context.Context, query *models.DeleteReportTenantDetails) error {
	return ss.WithTransactionalDbSession(ctx, func(sess *DBSession) error {
		if _, err := sess.Table("report_tenant_details").
			Delete(query); err != nil {
			return err
		}
		return nil
	})
}

func (ss *SQLStore) CountReportsByTenant(ctx context.Context, query *models.GetCountReportByTenant) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		count, err := dbSession.Table("report_data").
			Where("report_data.org_id = ?", query.OrgId).
			Count()
		if err != nil {
			return err
		}
		query.Result = &count
		return nil
	})
}
