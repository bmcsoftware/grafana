/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by ymulthan at 12/20/2021
 */

package migrations

import (
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

}
