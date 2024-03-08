/*
 * Copyright (C) 2023 BMC Software Inc
 * Added by abjadhav at 10/16/2023
 */

package migrations

import (
	. "github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

func addMiscellaneousStoreMigrations(mg *Migrator) {
	miscellaneousStoreTableV1 := Table{
		Name: "miscellaneous_store",
		Columns: []*Column{
			{Name: "tenant_id", Type: DB_BigInt, IsPrimaryKey: true, Nullable: false},
			{Name: "op_key", Type: DB_Text, IsPrimaryKey: true, Nullable: false},
			{Name: "op_value", Type: DB_Text, Nullable: false},
			{Name: "created_time", Type: DB_DateTime, Nullable: true},
			{Name: "updated_time", Type: DB_DateTime, Nullable: true},
		},
		Indices: []*Index{},
	}
	mg.AddMigration("create miscellaneous store table v1", NewAddTableMigration(miscellaneousStoreTableV1))

}
