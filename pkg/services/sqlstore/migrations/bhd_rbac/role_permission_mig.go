/*
 * Copyright (C) 2023 BMC Software Inc
 * Added by abjadhav at 10/16/2023
 */

package mig_rbac

import (
	"fmt"
	"strings"

	mig "github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

func AddRolePermissionRbacTable(mg *mig.Migrator) {
	BHDRolePermissionTableV1 := mig.Table{
		Name: "bhd_role_permission",
		Columns: []*mig.Column{
			{Name: "bhd_role_id", Type: mig.DB_BigInt, IsPrimaryKey: true, Nullable: false},
			{Name: "bhd_permission_name", Type: mig.DB_Text, IsPrimaryKey: true, Nullable: false},
			{Name: "org_id", Type: mig.DB_BigInt, IsPrimaryKey: true, Nullable: false},
		},
		Indices: []*mig.Index{
			{
				Name: "bhd_role_permission",
				Cols: []string{"bhd_role_id", "bhd_permission_name"},
				Type: mig.UniqueIndex,
			},
		},
	}
	mg.AddMigration("bhd: create bhd_role_permission table v1", mig.NewAddTableMigration(BHDRolePermissionTableV1))
	mg.AddMigration("bhd: alter table bhd_role_permission create index bhd_role_permission", mig.NewAddIndexMigration(BHDRolePermissionTableV1, BHDRolePermissionTableV1.Indices[0]))

	rawSQL := `ALTER TABLE bhd_role_permission ADD CONSTRAINT bhd_role_permission_permission_name_fkey FOREIGN KEY (bhd_permission_name) REFERENCES bhd_permission(name) ON DELETE CASCADE;`
	mg.AddMigration("bhd: alter table bhd_role_permission to add team_id FOREIGN KEY constraints", mig.NewRawSQLMigration(rawSQL))

	rawSQL = `ALTER TABLE bhd_role_permission ADD CONSTRAINT bhd_role_permission_bhd_role_id_fkey FOREIGN KEY (bhd_role_id) REFERENCES bhd_role(bhd_role_id) ON DELETE CASCADE;`
	mg.AddMigration("bhd: alter table bhd_role_permission to add role_id FOREIGN KEY constraints", mig.NewRawSQLMigration(rawSQL))

	// rawSQL = addDefaultPermissionForBuiltInAdminRole(1, BhdBuiltInAdminPermissions)
	// mg.AddMigration("bhd: insert default permissions for builtin role Admin", mig.NewRawSQLMigration(rawSQL))

	// rawSQL = addDefaultPermissionForBuiltInAdminRole(2, BhdBuiltInEditorPermissions)
	// mg.AddMigration("bhd: insert default permissions for builtin role Editor", mig.NewRawSQLMigration(rawSQL))

	// rawSQL = addDefaultPermissionForBuiltInAdminRole(3, BhdBuiltInViewerPermissions)
	// mg.AddMigration("bhd: insert default permissions for builtin role Viewer", mig.NewRawSQLMigration(rawSQL))
}

func addDefaultPermissionForBuiltInAdminRole(roleID int64, permissions []BhdPermission) string {
	rawSQL := `INSERT INTO bhd_role_permission(bhd_role_id, bhd_permission_name, org_id) VALUES`
	values := make([]string, 0)
	for _, permission := range permissions {
		value := fmt.Sprintf("(%d, '%s', 1)",
			roleID,
			permission.Name,
		)
		values = append(values, value)
	}
	permissionValues := strings.Join(values, ", ")
	rawSQL = rawSQL + " " + permissionValues
	return rawSQL
}
