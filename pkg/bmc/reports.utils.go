package bmc

import (
	"github.com/grafana/grafana/pkg/util"
)

func ReportModelToDTO(report *ReportModel) ReportsResponse {
	return ReportsResponse{
		ID:          report.ID,
		Name:        report.Name,
		Description: report.Description,
		Dashboard: struct {
			Id    int64  `json:"id"`
			Title string `json:"title"`
			Uid   string `json:"uid"`
		}{
			Id:    report.DashID,
			Title: report.DashTitle,
			Uid:   report.DashUid,
		},
		ReportType:   report.ReportType,
		ScheduleType: report.ScheduleType,
		ServerDir:    report.ServerDir,
		Filter: struct {
			TimeRange   string `json:"timeRange"`
			TimeRangeTo string `json:"timeRangeTo"`
			Filter      string `json:"filter"`
		}{
			TimeRange:   report.TimeRange,
			TimeRangeTo: report.TimeRangeTo,
			Filter:      report.Filter,
		},
		Share: struct {
			Subject    string   `json:"subject"`
			Message    string   `json:"message"`
			Recipients []string `json:"recipients"`
			ReplyTo    string   `json:"replyTo"`
		}{
			Subject:    report.Subject,
			Message:    report.Message,
			Recipients: util.SplitStr(report.Recipients),
			ReplyTo:    "",
		},
		Style: struct {
			Layout      string `json:"layout"`
			Orientation string `json:"orientation"`
			Theme       string `json:"theme"`
		}{
			Layout:      report.Layout,
			Orientation: report.Orientation,
			Theme:       "",
		},
		Schedule: struct {
			Cron     string `json:"cron"`
			Timezone string `json:"timezone"`
		}{
			Cron:     report.Cron,
			Timezone: report.Timezone,
		},
		User: struct {
			ID    int64  `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		}{
			ID:    report.UserID,
			Name:  report.UserName,
			Email: report.UserEmail,
		},
		Info: struct {
			CreatedAt int64 `json:"createdAt"`
			UpdatedAt int64 `json:"updatedAt"`
			NextAt    int64 `json:"nextAt"`
			LastAt    int64 `json:"lastAt"`
		}{
			CreatedAt: report.CreatedAt.Unix(),
			UpdatedAt: report.UpdatedAt.Unix(),
			NextAt:    report.NextAt,
			LastAt:    report.LastAt,
		},
		Enabled:      report.Enabled,
		HasDateStamp: report.HasDateStamp,
		HasTimeStamp: report.HasTimeStamp,
	}
}
