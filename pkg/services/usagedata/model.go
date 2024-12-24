package usagedata

import (
	"errors"
	"fmt"
)

// Typed errors
var (
	ErrNoDashboardsFound              = errors.New("no dashboards found")
	ErrNoUserCountsFound              = errors.New("no user counts found")
	ErrNoScheduledReportsFound        = errors.New("no scheduled reports found")
	ErrNoDashboardsWithUsageDataFound = errors.New("usage data does not exist or has not been collected for any dashboard")
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
	TotalUsers           int64   `xorm:"TotalUsers"`
	ActiveUsers          int64   `xorm:"ActiveUsers"`
	ReferenceEpoch30Days float64 `xorm:"reference_epoch"`
	Id_User              int64   `xorm:"id"`
	Login_User           string  `xorm:"login"`
	Email_User           string  `xorm:"email"`
	Name_User            string  `xorm:"name"`
	Created              string  `xorm:"created"`
	Last_seen_At_Epoch   float64 `xorm:"last_seen_at_epoch"`
	Uid                  string  `xorm:"uid"`
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
	LastRunStatus		string `xorm:"lastrunstatus"`
	Description         string `xorm:"description"`
}

type ScheduleResponse struct {
	Data      []Schedule
	StartTime string
	EndTime   string
}

func (r ScheduleResponse) Len() int {
	return len(r.Data)
}

type OrgLevelDashboardStatistics struct {
	DashboardID      string  `xorm:"dashboard_id"`
	DashboardUID     string  `xorm:"dashboard_uid"`
	DashboardTitle   string  `xorm:"dashboard_title"`
	TotalViews       int64   `xorm:"total_views"`
	AvgLoadTime      float64 `xorm:"avg_load_time"`
	LastAccessedTime string  `xorm:"last_accessed_time"`
}

type OrgLevelDashboardStatisticsResponse struct {
	Data      []OrgLevelDashboardStatistics
	StartTime string
	EndTime   string
}

func (o OrgLevelDashboardStatisticsResponse) Len() int {
	return len(o.Data)
}

type IndividualDashboardStatistics struct {
	DashboardUID     string  `xorm:"dashboard_uid"`
	DashboardTitle   string  `xorm:"dashboard_title"`
	TotalViews       int64   `xorm:"total_views"`
	AvgLoadTime      float64 `xorm:"avg_load_time"`
	LastAccessedTime string  `xorm:"last_accessed_time"`
}

type IndividualDashboardStatisticsResponse struct {
	Data []IndividualDashboardStatistics
}

func (i IndividualDashboardStatisticsResponse) Len() int {
	return len(i.Data)
}

type DashboardHits struct {
	Hits          int64  `xorm:"hits"`
	CollectedTime string `xorm:"collected_time"`
}

type DashboardHitsResponse struct {
	Data []DashboardHits
}

func (d DashboardHitsResponse) Len() int {
	return len(d.Data)
}

type DashboardLoadTimes struct {
	LoadTime      float64 `xorm:"load_time"`
	CollectedTime string  `xorm:"collected_time"`
}

type DashboardLoadTimesResponse struct {
	Data []DashboardLoadTimes
}

func (d DashboardLoadTimesResponse) Len() int {
	return len(d.Data)
}
