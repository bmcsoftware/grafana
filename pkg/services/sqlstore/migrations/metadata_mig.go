/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by ymulthan at 12/20/2021
 */

package migrations

import (
	"fmt"
	"time"

	. "github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

// We are creating metadata view list table in grafana postgres db
// Also adding ootb entries for view which are supposed to be available for all tenants (with tenant 1)

func addMetaDataView(mg *Migrator) {
	metaDataTableV1 := Table{
		Name: "rms_metadata_view_list",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "name", Type: DB_Text, Nullable: false},
			{Name: "tenant_id", Type: DB_BigInt, Nullable: false},
			{Name: "user_id", Type: DB_BigInt, Nullable: false},
			{Name: "file_key", Type: DB_Text, Nullable: false},
			{Name: "itsm_comp_version", Type: DB_Text, Nullable: false},
			{Name: "created", Type: DB_DateTime, Nullable: false},
			{Name: "updated", Type: DB_DateTime, Nullable: false},
		},
		Indices: []*Index{
			{Cols: []string{"name", "tenant_id"}, Type: UniqueIndex},
		},
	}

	// Create new view list table if not created already through grafana migration utility
	mg.AddMigration("create metadata view list table v1", NewAddTableMigration(metaDataTableV1))

	created := time.Now()
	formattedTs := fmt.Sprintf("%d-%02d-%02dT%02d:%02d:%02d",
		created.Year(), created.Month(), created.Day(),
		created.Hour(), created.Minute(), created.Second())
	mg.AddMigration("ITSM view : Incident Management V1",
		NewRawSQLMigration(fmt.Sprintf(`
		  INSERT INTO rms_metadata_view_list (name, tenant_id, user_id, file_key, itsm_comp_version, created, updated)
		  VALUES('Incident Management', 1, 1, 'Incident_Management','22_1_04', '%s', '%s')`, formattedTs, formattedTs)),
	)

	mg.AddMigration("BWF view : BWF V1",
		NewRawSQLMigration(fmt.Sprintf(`
		  INSERT INTO rms_metadata_view_list (name, tenant_id, user_id, file_key, itsm_comp_version, created, updated)
		  VALUES('BWF', 1, 1, 'BWF','22_1_04', '%s', '%s')`, formattedTs, formattedTs)),
	)

}
