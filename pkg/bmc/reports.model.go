package bmc

import "time"

type GetAllReports struct {
	Auth      Auth
	QueryName string
	Result    []*ReportModel
}

type GetReportByID struct {
	Auth   Auth
	ID     int64
	Result *ReportModel
}

type ReportModel struct {
	ID          int64  `xorm:"id"`
	Name        string `xorm:"name"`
	Description string `xorm:"description"`

	DashID    int64  `xorm:"dash_id"`
	DashTitle string `xorm:"dash_title"`
	DashUid   string `xorm:"dash_uid"`

	ReportType   string `xorm:"report_type"`
	ScheduleType string `xorm:"schedule_type"`
	ServerDir    string `xorm:"server_dir"`

	TimeRange   string `xorm:"time_range"`
	TimeRangeTo string `xorm:"time_range_to"`
	Filter      string `xorm:"filter"`

	Subject    string `xorm:"subject"`
	Message    string `xorm:"message"`
	Recipients string `xorm:"recipients"`
	//ReplyTo    string   `xorm:"replyTo"`

	Layout      string `xorm:"layout"`
	Orientation string `xorm:"orientation"`
	//Theme       string `xorm:"theme"`

	Cron     string `xorm:"cron"`
	Timezone string `xorm:"timezone"`

	UserID    int64  `xorm:"user_id"`
	UserName  string `xorm:"user_name"`
	UserEmail string `xorm:"user_email"`

	CreatedAt *time.Time `xorm:"created_at"`
	UpdatedAt *time.Time `xorm:"updated_at"`
	NextAt    int64      `xorm:"next_at"`
	LastAt    int64      `xorm:"last_at"`

	Enabled      bool `json:"enabled"`
	HasDateStamp bool `json:"hasDateStamp"`
	HasTimeStamp bool `json:"hasTimeStamp"`
}

type Auth struct {
	UserID      int64
	OrgID       int64
	IsOrgAdmin  bool
	IsSuperUser bool
}
