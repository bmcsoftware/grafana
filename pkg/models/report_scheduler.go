package models

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrReportSchedulerNotFound          = errors.New("report scheduler does not exist")
	ErrReportSchedulerListEmpty         = errors.New("report scheduler list is empty")
	ErrReportSchedulerNameExists        = errors.New("report scheduler with the same name already exists")
	ErrInvalidId                        = errors.New("invalid id")
	ErrMissingData                      = errors.New("please fill the data required")
	ErrReportEditFailed                 = errors.New("cannot edit the dashboard for existing report schedule")
	ErrReportTenantDetailsLimitNotFound = errors.New("report tenant details not found")
	ErrReportTenantDetailsLimitReached  = errors.New("report schedule limit exceeded")
)

type RScheduler struct {
	StartFrom *time.Time
	EndAt     *time.Time
	Cron      string
	Timezone  string
}

type RSData struct {
	Id           int64 `xorm:"pk 'id'"`
	OrgId        int64
	UserId       int64
	Name         string
	Description  string
	DashboardId  int64
	TimeRange    string
	TimeRangeTo  string
	Filter       string
	ReplyTo      string
	Subject      string
	Recipients   string
	Message      string
	Orientation  string
	Layout       string
	Enabled      bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	NextAt       sql.NullInt64
	LastAt       sql.NullInt64
	ReportType   string
	ScheduleType string
	ServerDir    string
	HasDateStamp bool
	HasTimeStamp bool
	RSchedulerId int64 `xorm:"report_scheduler_id"`
	*RScheduler  `xorm:"extends"`
}
type GetAll struct {
	UserId      int64
	OrgId       int64
	QueryName   string
	QueryDashId int64
	Result      []*RSData
}
type GetById struct {
	UserId     int64
	OrgId      int64
	Id         int64
	Result     *RSData
	IsOrgAdmin bool
}
type GetByIds struct {
	UserId     int64
	OrgId      int64
	Ids        []int64
	Result     []*RSData
	IsOrgAdmin bool
}
type GetByName struct {
	UserId int64
	OrgId  int64
	Name   string
	Result *RSData
}
type GetByUserId struct {
	OrgId  int64
	UserId int64
	Result []*RSData
}
type GetByDashIds struct {
	UserId  int64
	OrgId   int64
	DashIds []int64
	Result  []*RSData
}

type GetJobById struct {
	Id         int64
	UserId     int64
	OrgId      int64
	IsOrgAdmin bool
	Result     *ExecuteRS
}

type InsertRS struct {
	Data      InsertRSData     `xorm:"extends"`
	Scheduler InsertRScheduler `xorm:"extends"`
}
type UpdateRS struct {
	Data       UpdateRSData `xorm:"extends"`
	UserId     int64
	Scheduler  InsertRScheduler `xorm:"extends"`
	IsOrgAdmin bool
}

type ExecuteRS struct {
	Id           int64
	Name         string
	Uid          string
	DashName     string
	NextAt       int64
	TimeRange    string
	TimeRangeTo  string
	Filter       string
	Orientation  string
	Layout       string
	Enabled      bool
	Timezone     string
	Cron         string
	Subject      string
	Recipients   string
	ReplyTo      string
	Message      string
	Description  string
	UserId       int64
	OrgId        int64
	ReportType   string
	ScheduleType string
	ServerDir    string
	HasDateStamp bool
	HasTimeStamp bool
}

type InsertRSData struct {
	Id           int64
	OrgId        int64
	UserId       int64
	Name         string
	Description  string
	DashboardId  int64
	TimeRange    string `xorm:"time_range"`
	TimeRangeTo  string `xorm:"time_range_to"`
	Filter       string
	ReplyTo      string
	Subject      string
	Recipients   string
	Message      string
	Orientation  string
	Layout       string
	Enabled      bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	NextAt       int64
	LastAt       int64
	ReportType   string
	SchedulerId  int64 `xorm:"report_scheduler_id"`
	ScheduleType string
	ServerDir    string
	HasDateStamp bool
	HasTimeStamp bool
}

type UpdateRSData struct {
	Id           int64
	OrgId        int64
	Name         string
	Description  string
	DashboardId  int64
	TimeRange    string `xorm:"time_range"`
	TimeRangeTo  string `xorm:"time_range_to"`
	Filter       string
	ReplyTo      string
	Subject      string
	Recipients   string
	Message      string
	Orientation  string
	Layout       string
	Enabled      bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	NextAt       int64
	LastAt       int64
	ReportType   string
	SchedulerId  int64 `xorm:"report_scheduler_id"`
	ScheduleType string
	ServerDir    string
	HasDateStamp bool `xorm:"has_date_stamp"`
	HasTimeStamp bool `xorm:"has_time_stamp"`
}
type InsertRScheduler struct {
	Id        int64
	StartFrom time.Time
	EndAt     time.Time
	Cron      string
	Timezone  string
}

type InsertRSJobQueue struct {
	Id          int64
	StartedAt   time.Time `xorm:"started_at"`
	ElapsedTime int64     `xorm:"elapsed_time"`
	ReportId    int64     `xorm:"report_data_id"`
}
type UpdateRSJobQueue struct {
	Id          int64
	FinishedAt  time.Time `xorm:"finished_at"`
	ElapsedTime int64     `xorm:"elapsed_time"`
}

type InsertRSJobStatus struct {
	Created     time.Time `xorm:"'date_time'"`
	Status      int       `xorm:"'value'"`
	Description string    `xorm:"'description'"`
	JobId       int64     `xorm:"'job_queue_id'"`
}

type DeleteRS struct {
	Ids        []int64
	OrgId      int64
	UserId     int64
	IsOrgAdmin bool
}

type DeleteRSByDashIds struct {
	Ids    []int64
	UserId int64
	OrgId  int64
}

type EnableRS struct {
	Ids        []int64
	UserId     int64
	OrgId      int64
	IsOrgAdmin bool
}

type DisableRS struct {
	Ids        []int64
	UserId     int64
	OrgId      int64
	IsOrgAdmin bool
}

type StartRS struct {
	Id    int64
	Mails string
}

type TestRS struct {
	Id    int64
	Mails string
}

type RemoveOrDisableOrgSchedules struct {
	OrgId        int64
	IsOffboarded bool
}

type ReportTenantDetails struct {
	Type  string `xorm:"type"`
	Limit int    `xorm:"limit"`
}

type GetReportTenantDetails struct {
	OrgId  int64
	Result *ReportTenantDetails
}

type CreateOrUpdateReportTenantDetails struct {
	OrgId               int64 `xorm:"org_id"`
	ReportTenantDetails `xorm:"extends"`
}
type DeleteReportTenantDetails struct {
	OrgId int64
}

type GetCountReportByTenant struct {
	OrgId  int64
	Result *int64
}
