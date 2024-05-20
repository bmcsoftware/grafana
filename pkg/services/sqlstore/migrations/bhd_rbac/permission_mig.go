/*
 * Copyright (C) 2023 BMC Software Inc
 * Added by kmejdi at 12/06/2023
 */

package mig_rbac

import (
	"fmt"
	"strings"

	mig "github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

func AddPermissionRbacTable(mg *mig.Migrator) {
	rbacPermissionTableV1 := mig.Table{
		Name: "bhd_permission",
		Columns: []*mig.Column{
			{Name: "name", Type: mig.DB_Text, Nullable: false, IsPrimaryKey: true},
			{Name: "group", Type: mig.DB_Text, Nullable: true},
			{Name: "default_permission", Type: mig.DB_Bool, Nullable: false, Default: "false"},
			{Name: "is_active", Type: mig.DB_Bool, Nullable: false, Default: "'true'"},
			{Name: "created_time", Type: mig.DB_DateTime, Nullable: false},
			{Name: "updated_time", Type: mig.DB_DateTime, Nullable: false},
			{Name: "created_by", Type: mig.DB_Text, Nullable: false, Default: "'system'"},
			{Name: "updated_by", Type: mig.DB_Text, Nullable: false, Default: "'system'"},
		},
	}

	mg.AddMigration("bhd: create bhd_permission table v1", mig.NewAddTableMigration(rbacPermissionTableV1))
	mg.AddMigration("bhd: Add column display_name in bhd_permission", mig.NewAddColumnMigration(rbacPermissionTableV1, &mig.Column{
		Name: "display_name", Type: mig.DB_Text, Nullable: true}))
	mg.AddMigration("bhd: Add column description in bhd_permission", mig.NewAddColumnMigration(rbacPermissionTableV1, &mig.Column{
		Name: "description", Type: mig.DB_Text, Nullable: true}))
	mg.AddMigration("bhd: insert default supported permissions for built in roles", mig.NewRawSQLMigration(insertQueryForDefaultPermissions()))
}

func insertQueryForDefaultPermissions() string {
	rawSQL := `INSERT INTO bhd_permission(name, "group", display_name, description, default_permission, created_time, updated_time) VALUES`

	values := make([]string, 0)
	for _, permission := range BhdSupportedPermissions {
		value := fmt.Sprintf("('%s', '%s', '%s', '%s', '%v', 'NOW()', 'NOW()')",
			permission.Permission,
			permission.Group,
			permission.DisplayName,
			permission.Description,
			permission.AlwaysEnabled,
		)
		values = append(values, value)
	}

	permissionValues := strings.Join(values, ", ")
	rawSQL = rawSQL + " " + permissionValues
	return rawSQL
}
