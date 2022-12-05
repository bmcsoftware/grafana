package migrations

import (
	. "github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

func addReportSchedulerMigrations(mg *Migrator) {

	//------------------  report_data table -------------------
	reportDataV1 := Table{
		Name: "report_data",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "org_id", Type: DB_BigInt, Nullable: false},
			{Name: "user_id", Type: DB_BigInt, Nullable: false},
			{Name: "name", Type: DB_NVarchar, Length: 190, Nullable: false},
			{Name: "description", Type: DB_NVarchar, Length: 255, Nullable: true},
			{Name: "dashboard_id", Type: DB_BigInt, Nullable: false},
			{Name: "time_range", Type: DB_NVarchar, Length: 32, Nullable: true},
			{Name: "filter", Type: DB_Text, Nullable: true},
			{Name: "recipients", Type: DB_Text, Nullable: false},
			{Name: "reply_to", Type: DB_NVarchar, Length: 255, Nullable: true},
			{Name: "subject", Type: DB_Text, Nullable: true},
			{Name: "message", Type: DB_Text, Nullable: true},
			{Name: "layout", Type: DB_NVarchar, Length: 50, Nullable: true},
			{Name: "orientation", Type: DB_NVarchar, Length: 10, Nullable: true},
			{Name: "created_at", Type: DB_DateTime, Nullable: false},
			{Name: "updated_at", Type: DB_DateTime, Nullable: false},
			{Name: "next_at", Type: DB_BigInt, Nullable: true},
			{Name: "last_at", Type: DB_BigInt, Nullable: true},
			{Name: "enabled", Type: DB_Bool, Nullable: false},
			{Name: "report_scheduler_id", Type: DB_BigInt, Nullable: true},
			{Name: "report_settings_id", Type: DB_BigInt, Nullable: true},
		},
		Indices: []*Index{},
	}
	mg.AddMigration("create report_data table v3", NewAddTableMigration(reportDataV1))

	// add column reportType
	mg.AddMigration("Add column report_type in report_data", NewAddColumnMigration(reportDataV1, &Column{
		Name: "report_type", Type: DB_NVarchar, Length: 5, Nullable: false, Default: "'pdf'",
	}))

	// add column schedule_type & server_dir, Extended support for FTP protocol
	mg.AddMigration("Add column schedule_type in report_data", NewAddColumnMigration(reportDataV1, &Column{
		Name: "schedule_type", Type: DB_NVarchar, Length: 5, Nullable: false, Default: "'email'",
	}))
	mg.AddMigration("Add column server_dir in report_data", NewAddColumnMigration(reportDataV1, &Column{
		Name: "server_dir", Type: DB_NVarchar, Length: 265, Nullable: true,
	}))
	mg.AddMigration("Add column has_date_stamp in report_data", NewAddColumnMigration(reportDataV1, &Column{
		Name: "has_date_stamp", Type: DB_Bool, Nullable: true,
	}))
	mg.AddMigration("Add column has_time_stamp in report_data", NewAddColumnMigration(reportDataV1, &Column{
		Name: "has_time_stamp", Type: DB_Bool, Nullable: true,
	}))
	//-------  report_scheduler table -------------------
	reportSchedulerV1 := Table{
		Name: "report_scheduler",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "start_from", Type: DB_TimeStamp, Nullable: true},
			{Name: "end_at", Type: DB_TimeStamp, Nullable: true},
			{Name: "cron", Type: DB_Text, Nullable: false},
			{Name: "timezone", Type: DB_NVarchar, Length: 64, Nullable: false},
		}, Indices: []*Index{},
	}
	// ---- Fix to delete older report_scheduler table version ----
	mg.AddMigration("drop old report_scheduler table", NewDropTableMigration(reportSchedulerV1.Name))
	mg.AddMigration("create table report scheduler", NewAddTableMigration(reportSchedulerV1))

	//-------  report_option table -------------------
	reportSettingsV1 := Table{
		Name: "report_settings",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "company_logo_url", Type: DB_Text, Nullable: true},
			{Name: "footer_sent_by", Type: DB_Bool, Nullable: true},
			{Name: "footer_text", Type: DB_Text, Nullable: true},
			{Name: "footer_text_url", Type: DB_Text, Nullable: true},
			{Name: "org_id", Type: DB_Int, Nullable: false},
		},
	}
	mg.AddMigration("create report_settings table v3", NewAddTableMigration(reportSettingsV1))

	//-------  job_queue table -------------------
	reportJobQueueV1 := Table{
		Name: "job_queue",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "started_at", Type: DB_TimeStamp, Nullable: false},
			{Name: "finished_at", Type: DB_TimeStamp, Nullable: true},
			{Name: "elapsed_time", Type: DB_BigInt, Nullable: false},
			{Name: "report_data_id", Type: DB_BigInt, Nullable: false},
		},
	}
	mg.AddMigration("create job_queue table v3", NewAddTableMigration(reportJobQueueV1))

	//-------  job_status table -------------------
	reportJobStatusV1 := Table{
		Name: "job_status",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "date_time", Type: DB_TimeStamp, Nullable: false},
			{Name: "value", Type: DB_Int, Nullable: false},
			{Name: "description", Type: DB_Text, Nullable: true},
			{Name: "job_queue_id", Type: DB_BigInt, Nullable: false},
		},
	}
	mg.AddMigration("create job_status table v3", NewAddTableMigration(reportJobStatusV1))

	mg.AddMigration("Alter scheduler job_queue table, add file_key",
		NewAddColumnMigration(reportJobQueueV1, &Column{Name: "file_key", Type: DB_Text, Nullable: true}))
	mg.AddMigration("Alter scheduler job_queue table, add file_version",
		NewAddColumnMigration(reportJobQueueV1, &Column{Name: "file_version", Type: DB_Text, Nullable: true}))
	mg.AddMigration("Alter scheduler job_queue table, add deleted",
		NewAddColumnMigration(reportJobQueueV1, &Column{Name: "deleted", Type: DB_Bool, Nullable: true, Default: "0"}))

	mg.AddMigration("Alter scheduler settings table, add internal_domains_only",
		NewAddColumnMigration(reportSettingsV1, &Column{Name: "internal_domains_only", Type: DB_Bool, Nullable: false, Default: "false"}))
	mg.AddMigration("Alter scheduler settings table, add whitelisted_domains",
		NewAddColumnMigration(reportSettingsV1, &Column{Name: "whitelisted_domains", Type: DB_Text, Nullable: true}))

	//-------  report_org table -------------------
	reportTenantDetailsV1 := Table{
		Name: "report_tenant_details",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "org_id", Type: DB_BigInt, Nullable: false},
			{Name: "type", Type: DB_Text, Nullable: false},
			{Name: "limit", Type: DB_Int, Nullable: false},
		},
	}
	mg.AddMigration("create report_tenant_details table v1", NewAddTableMigration(reportTenantDetailsV1))

	//-------  report_ftp_config table -------------------
	reportFtpConfigV1 := Table{
		Name: "report_ftp_config",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "org_id", Type: DB_BigInt, Nullable: false},
			{Name: "ftp_host", Type: DB_Text, Nullable: true},
			{Name: "ftp_port", Type: DB_Int, Nullable: true},
			{Name: "user_name", Type: DB_Text, Nullable: true},
			{Name: "password", Type: DB_Text, Nullable: true},
		},
	}
	mg.AddMigration("create report_ftp_config table v1", NewAddTableMigration(reportFtpConfigV1))

	mg.AddMigration("Alter table report_data add column time_range_to v1", NewAddColumnMigration(reportDataV1, &Column{
		Name: "time_range_to", Type: DB_Text, Nullable: true, Default: "",
	}))

	mg.AddMigration("Alter table report_settings add column storage_retention v1", NewAddColumnMigration(reportSettingsV1, &Column{
		Name: "storage_retention", Type: DB_Int, Nullable: true, Default: "7",
	}))

	mg.AddMigration("Alter table report_settings add column date_format v1", NewAddColumnMigration(reportSettingsV1, &Column{
		Name: "date_format", Type: DB_Text, Nullable: true, Default: "'DD/MM/YYYY, HH:mm:ss Z z'::text",
	}))
}
