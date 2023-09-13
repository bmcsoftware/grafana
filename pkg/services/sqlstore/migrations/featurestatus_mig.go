/*
 * Copyright (C) 2022 BMC Software Inc
 * Added by ymulthan at 4/12/2022
 */

package migrations

import (
	. "github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

func addFeatureStatusMigrations(mg *Migrator) {
	featureStatusTableV1 := Table{
		Name: "feature_status",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "org_id", Type: DB_BigInt, Nullable: false},
			{Name: "feature_name", Type: DB_Text, Nullable: false},
			{Name: "status", Type: DB_Bool, Nullable: false},
		},
		Indices: []*Index{},
	}
	mg.AddMigration("create feature status table v1", NewAddTableMigration(featureStatusTableV1))

	// Add snapshot feature with default status as false.
	mg.AddMigration("Add snapshot feature with default status as false",
		NewRawSQLMigration(`
			INSERT INTO feature_status (org_id, feature_name, status)
			VALUES(1, 'Snapshot','false')`),
	)

	// Add bmc crosstab color override feature with default status as false.
	mg.AddMigration("Add bmc crosstab color override feature with default status as false",
		NewRawSQLMigration(`
			INSERT INTO feature_status (org_id, feature_name, status)
			VALUES(1, 'bmc-crosstab-color-override','false')`),
	)

	// update feature name from bmc-crosstab-color-override to Headers color palette for BMC Cross-tab plugin.
	mg.AddMigration("Update feature name from bmc-crosstab-color-override to Headers color palette for BMC Cross-tab plugin",
		NewRawSQLMigration(`
			UPDATE feature_status set feature_name = 'Headers color palette for BMC Cross-tab plugin' where feature_name = 'bmc-crosstab-color-override'`),
	)
}
