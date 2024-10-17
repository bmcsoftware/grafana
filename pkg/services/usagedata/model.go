package usagedata

import (
	"errors"
	"fmt"
)

// Typed errors
var (
	ErrNoDashboardsFound       = errors.New("no dashboards found")
	ErrNoUserCountsFound       = errors.New("no user counts found")
	ErrNoScheduledReportsFound = errors.New("no scheduled reports found")
)

type Panel struct {
	ID                  string `xorm:"DashboardUID"`
	Title               string `xorm:"DashboardTitle"`
	PluginType          string `xorm:"plugintype"`
	PanelTitle          string `xorm:"paneltitle"`
	Creator             string `xorm:"DashboardCreator"`
	CreatedTime         string `xorm:"CreateDate"`
	LastUpdatedTime     string `xorm:"UpdateDate"`
	NumReportsScheduled int    `xorm:"NoOfReportSchedules"`
	Deprecated          bool
}

func (d Panel) String() string {
	return fmt.Sprintf("%v - %v using \"%v\" plugin on  \"%v\" panel", d.Title, d.ID, d.PluginType, d.PanelTitle)
}

type PluginInfoResponse struct {
	Data []Panel
}

func (r PluginInfoResponse) Len() int {
	return len(r.Data)
}

type UserCounts struct {
	Total  int64 `xorm:"TotalUsers"`
	Active int64 `xorm:"ActiveUsers"`
}

type UserCountResponse struct {
	Data []UserCounts
}

func (u UserCountResponse) Len() int {
	return len(u.Data)
}

type Schedule struct {
	ReportId            int    `xorm:"reportid"`
	IsActive            bool   `xorm:"isactive"`
	ScheduleName        string `xorm:"schedulename"`
	Creator             string `xorm:"creator"`
	DashboardName       string `xorm:"dashboardname"`
	DashboardUID        string `xorm:"dashboarduid"`
	Created             string `xorm:"created"`
	LastUpdated         string `xorm:"lastupdated"`
	ReportType          string `xorm:"reporttype"`
	ScheduleType        string `xorm:"scheduletype"`
	PassCount           int    `xorm:"passcount"`
	FailCount           int    `xorm:"failcount"`
	TotalExecutionCount int    `xorm:"totalexecutioncount"`
}

type ScheduleResponse struct {
	Data      []Schedule
	StartTime int64
	EndTime   int64
}

func (r ScheduleResponse) Len() int {
	return len(r.Data)
}

type DashboardHitCount struct {
	DashboardId      string `xorm:"dashboard_uid"`
	DashboardName    string `xorm:"dashboard_title"`
	TimeFilteredHits int64  `xorm:"sum_delta_data"`
	TotalHits        int64  `xorm:"total_dashboard_views"`
}

type DashboardHitCountsResponse struct {
	Data      []DashboardHitCount
	StartTime int64
	EndTime   int64
}

func (r DashboardHitCountsResponse) Len() int {
	return len(r.Data)
}
