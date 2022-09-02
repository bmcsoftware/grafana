package sqlstore

import (
	"fmt"
	"strings"
	"time"
	"context"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"
)

func init() {
	bus.AddHandlerCtx("sql", GetAllRS)
	bus.AddHandlerCtx("sql", GetRSById)
	bus.AddHandlerCtx("sql", GetRSByDashIds)

	bus.AddHandlerCtx("sql", InsertRS)
	bus.AddHandlerCtx("sql", UpdateRS)

	bus.AddHandlerCtx("sql", DeleteRS)
	bus.AddHandlerCtx("sql", DeleteRSByDashIds)

	bus.AddHandlerCtx("sql", InsertRSJobQueue)
	bus.AddHandlerCtx("sql", UpdateRSJobQueue)
	bus.AddHandlerCtx("sql", InsertRSJobStatus)

	bus.AddHandlerCtx("sql", EnableRS)
	bus.AddHandlerCtx("sql", DisableRS)
	bus.AddHandlerCtx("sql", ExecuteRS)

	bus.AddHandlerCtx("sql", RemoveOrDisableOrgSchedules)

	bus.AddHandlerCtx("sql", GetReportOrg)
	bus.AddHandlerCtx("sql", CreateOrUpdateReportOrg)
	bus.AddHandlerCtx("sql", DeleteReportOrg)
	bus.AddHandlerCtx("sql", CountReportsByTenant)
}

func GetAllRS(ctx context.Context, query *models.GetAll) error {
	results := make([]*models.RSData, 0)

	sess := x.Table("report_data").
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
}
func GetRSById(ctx context.Context, query *models.GetById) error {
	results := make([]*models.RSData, 0)

	if err := x.Table("report_data").
		Join("LEFT", "report_scheduler", "report_scheduler.id = report_data.report_scheduler_id").
		Where("report_data.user_id = ?", query.UserId).
		Where("report_data.org_id = ?", query.OrgId).
		Where("report_data.id = ?", query.Id).
		Find(&results); err != nil {
		return err
	}

	if len(results) == 0 {
		return models.ErrReportSchedulerNotFound
	}

	query.Result = results[0]
	return nil
}
func GetRSByIds(query *models.GetByIds) error {
	results := make([]*models.RSData, 0)

	if err := x.Table("report_data").
		Join("LEFT", "report_scheduler", "report_scheduler.id = report_data.report_scheduler_id").
		Where("report_data.user_id = ?", query.UserId).
		Where("report_data.org_id = ?", query.OrgId).
		In("report_data.id", query.Ids).
		Find(&results); err != nil {
		return err
	}

	if len(results) == 0 {
		return models.ErrReportSchedulerNotFound
	}

	query.Result = results
	return nil
}
func GetRSByDashIds(ctx context.Context, query *models.GetByDashIds) error {
	results := make([]*models.RSData, 0)
	if err := x.Table("report_data").
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
}

func InsertRS(ctx context.Context, query *models.InsertRS) error {
	return inTransaction(func(sess *DBSession) error {
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
func UpdateRS(ctx context.Context, query *models.UpdateRS) error {
	return inTransaction(func(sess *DBSession) error {
		// Query the report by Id to know its name
		// Then compare the old name with the updated
		// name from queryParams if the condition is valid
		// that means it is required to check if the name
		// exists already or not
		selectOne := models.GetById{
			UserId: query.Data.UserId,
			OrgId:  query.Data.OrgId,
			Id:     query.Data.Id,
		}
		if err := GetRSById(ctx, &selectOne); err != nil {
			return err
		}
		if query.Data.DashboardId != selectOne.Result.DashboardId {
			return models.ErrReportEditFailed
		}
		if query.Data.Name != selectOne.Result.Name {
			existing := models.RSData{}
			has, _ := sess.Table("report_data").
				Select("name").
				Where("report_data.user_id = ?", query.Data.UserId).
				Where("report_data.name = ?", query.Data.Name).
				Where("report_data.dashboard_id = ? ", query.Data.DashboardId).
				Get(&existing)
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
func DeleteRS(ctx context.Context, query *models.DeleteRS) error {
	return inTransaction(func(sess *DBSession) error {
		for _, Id := range query.Ids {
			report := &models.GetById{
				UserId: query.UserId,
				OrgId:  query.OrgId,
				Id:     Id,
			}
			if err := GetRSById(ctx, report); err != nil {
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
func DeleteRSByDashIds(ctx context.Context, query *models.DeleteRSByDashIds) error {
	return inTransaction(func(sess *DBSession) error {
		reports := &models.GetByDashIds{
			UserId:  query.UserId,
			OrgId:   query.OrgId,
			DashIds: query.Ids,
		}
		if err := GetRSByDashIds(ctx, reports); err != nil {
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

func InsertRSJobQueue(ctx context.Context, query *models.InsertRSJobQueue) error {
	return inTransaction(func(sess *DBSession) error {
		if _, err := sess.Table("job_queue").
			Insert(query); err != nil {
			return err
		}
		return nil
	})
}
func UpdateRSJobQueue(ctx context.Context, query *models.UpdateRSJobQueue) error {
	return inTransaction(func(sess *DBSession) error {
		if _, err := sess.Table("job_queue").
			Where("job_queue.id = ?", query.Id).
			Update(query); err != nil {
			return err
		}
		return nil
	})
}
func InsertRSJobStatus(ctx context.Context, query *models.InsertRSJobStatus) error {
	return inTransaction(func(sess *DBSession) error {
		if _, err := sess.Table("job_status").
			Insert(query); err != nil {
			return err
		}
		return nil
	})
}

func EnableRS(ctx context.Context, query *models.EnableRS) error {
	return inTransaction(func(sess *DBSession) error {

		if len(query.Ids) == 0 {
			return models.ErrReportSchedulerListEmpty
		}
		reports := models.GetByIds{
			UserId: query.UserId,
			OrgId:  query.OrgId,
			Ids:    query.Ids,
		}
		if err := GetRSByIds(&reports); err != nil {
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
			if _, err := sess.Table("report_data").
				Where("report_data.user_id = ?", query.UserId).
				Where("report_data.id = ?", report.Id).
				UseBool("enabled").
				Update(&update); err != nil {
				return err
			}
		}

		return nil
	})
}
func DisableRS(ctx context.Context, query *models.DisableRS) error {
	return inTransaction(func(sess *DBSession) error {

		if len(query.Ids) == 0 {
			return models.ErrReportSchedulerListEmpty
		}

		update := struct{ Enabled bool }{Enabled: false}

		if _, err := sess.Table("report_data").
			Where("report_data.user_id = ?", query.UserId).
			Where("report_data.org_id = ?", query.OrgId).
			In("report_data.id", query.Ids).
			UseBool("enabled").
			Update(&update); err != nil {
			return err
		}
		return nil
	})
}
func ExecuteRS(ctx context.Context, query *models.GetJobById) error {
	report := &models.GetById{
		UserId: query.UserId,
		OrgId:  query.OrgId,
		Id:     query.Id,
	}
	err := GetRSById(ctx, report)
	if err != nil {
		return err
	}

	dashQuery := &models.GetDashboardQuery{
		Id:    report.Result.DashboardId,
		OrgId: report.Result.OrgId,
	}
	err = GetDashboard(ctx, dashQuery)
	if err != nil {
		return err
	}

	if report.Result.TimeRange == "" {
		timeRange, err := dashQuery.Result.Data.Get("time").Get("from").String()
		if err != nil {
			return err
		}
		report.Result.TimeRange = timeRange
	}
	result := report.Result
	query.Result = &models.ExecuteRS{
		Id:          result.Id,
		Name:        result.Name,
		Uid:         dashQuery.Result.Uid,
		DashName:    dashQuery.Result.Title,
		NextAt:      result.NextAt.Int64,
		TimeRange:   result.TimeRange,
		Filter:      result.Filter,
		Orientation: result.Orientation,
		Layout:      result.Layout,
		Enabled:     result.Enabled,
		Timezone:    result.Timezone,
		Cron:        result.Cron,
		Subject:     result.Subject,
		Recipients:  result.Recipients,
		ReplyTo:     result.ReplyTo,
		Message:     result.Message,
		Description: result.Description,
		UserId:      result.UserId,
		OrgId:       result.OrgId,
		ReportType:  result.ReportType,
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
		Nullable("filter", "time_range").
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

func RemoveOrDisableOrgSchedules(ctx context.Context, cmd *models.RemoveOrDisableOrgSchedules) error {
	return inTransaction(func(sess *DBSession) error {
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

func GetReportOrg(ctx context.Context, query *models.GetReportTenantDetails) error {
	results := make([]*models.ReportTenantDetails, 0)
	if err := x.Table("report_tenant_details").
		Where("report_tenant_details.org_id = ?", query.OrgId).
		Find(&results); err != nil {
		return err
	}

	if len(results) == 0 {
		return models.ErrReportTenantDetailsLimitNotFound
	}
	query.Result = results[0]
	return nil
}
func CreateOrUpdateReportOrg(ctx context.Context, query *models.CreateOrUpdateReportTenantDetails) error {
	// If no error means has data.
	hasData := GetReportOrg(ctx, &models.GetReportTenantDetails{OrgId: query.OrgId}) == nil
	return inTransaction(func(sess *DBSession) error {
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
func DeleteReportOrg(ctx context.Context, query *models.DeleteReportTenantDetails) error {
	return inTransaction(func(sess *DBSession) error {
		if _, err := sess.Table("report_tenant_details").
			Delete(query); err != nil {
			return err
		}
		return nil
	})
}

func CountReportsByTenant(ctx context.Context, query *models.GetCountReportByTenant) error {
	count, err := x.Table("report_data").
		Where("report_data.org_id = ?", query.OrgId).
		Count()
	if err != nil {
		return err
	}
	query.Result = &count
	return nil
}
