/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by abhasin at 03/08/2021
 */

package migrations

import (
	"fmt"

	. "github.com/grafana/grafana/pkg/services/sqlstore/migrator"
)

// We have created a table named 'calculatedfield' in postgres database to store all the calculated fields.
// org_id = 1 means it is delivered by BMC and available for all tenants
// Grafana has migration utility which do CRUD operation on Postgres datebase.
// Grafana maintains a 'migration_log' table to manage migration sql.
// func (*Migrator).AddMigration(id string, m Migration) - can be used to do operation on the database.
// if id passed to this function is present in 'migration_log' table grafana will not execute that function call.
// Make sure you give different id each time if want to execute any function call.
// Here m Migration can be created using func NewRawSQLMigration(sql string) -- sql can be any valid SQL query

const (
	query1  = "COUNT(`HPD:Help Desk`.`Incident Number`)"
	query2  = "SUM(CASE WHEN `HPD:Help Desk`.`Status` < ''Resolved'' then 1 ELSE 0 END)"
	query3  = "COUNT(`CHG:Infrastructure Change`.`Infrastructure Change ID`)"
	query4  = "SUM(CASE WHEN `CHG:Infrastructure Change`.`Change Request Status` > ''Draft'' AND `CHG:Infrastructure Change`.`Change Request Status` > ''Completed'' THEN 1 ELSE 0 END)"
	query5  = "COUNT(`PBM:Problem Investigation`.`Problem Investigation ID`)"
	query6  = "SUM(CASE WHEN `PBM:Problem Investigation`.`Priority` = ''Critical'' THEN 1 ELSE 0 END)"
	query7  = "COUNT(`WOI:WorkOrder`.`Work Order ID`)"
	query8  = "COUNT(`TMS:Task`.`Task ID`)"
	query9  = "COUNT(`RMS:Release`.`ReleaseID`)"
	query10 = "COUNT(`RKM:KnowledgeArticleManager`.`DocID`)"
	query11 = "COUNT(`SRM:Request`.`InstanceId`)"
	query12 = "COUNT(`AST:BaseElement`.`Asset ID+`)"
	query13 = "COUNT(`BMC.CORE:BMC_BaseElement`.`InstanceId`)"
	query14 = "AVG(CASE WHEN `HPD:Help Desk`.`Status` in (''Resolved'',''Closed'') THEN DateDiff(''dd'',`HPD:Help Desk`.`Submit Date`,`HPD:Help Desk`.`Last Resolved Date`) ELSE 0 END)"
	query15 = "Avg(`AST:CI Unavailability CI Join`.`Time Between System Incidents`)"
	query16 = "AVG(DateDiff(''ss'',`HPD:Help Desk`.`Reported Date`,`HPD:Help Desk`.`Responded Date`)/3600)"
)

func addCalculatedFields(mg *Migrator) {
	configTableV1 := Table{
		Name: "calculatedfield",
		Columns: []*Column{
			{Name: "id", Type: DB_BigInt, IsPrimaryKey: true, IsAutoIncrement: true},
			{Name: "org_id", Type: DB_BigInt, Nullable: false},
			{Name: "form_name", Type: DB_Text, Nullable: true},
			{Name: "module", Type: DB_Text, Nullable: true},
			{Name: "name", Type: DB_Text, Nullable: true},
			{Name: "sql_query", Type: DB_Text, Nullable: true},
		},
		Indices: []*Index{},
	}
	mg.AddMigration("create calculatedfield table v1", NewAddTableMigration(configTableV1))

	mg.AddMigration("create calculatedfield",
		NewRawSQLMigration(fmt.Sprintf(`
		   INSERT INTO calculatedfield (org_id, form_name, module, name, sql_query)
		   VALUES(1, 'HPD:Help Desk','Incident Management', 'Number of Incidents','%s'),
		   (1, 'HPD:Help Desk','Incident Management', 'Open Incidents','%s'),
		   (1, 'CHG:Infrastructure Change','Change Management', 'Number of Changes','%s'),
		   (1, 'CHG:Infrastructure Change','Change Management', 'Open Changes','%s'),
		   (1, 'PBM:Problem Investigation','Problem Management', 'Number of Problems','%s'),
		   (1, 'PBM:Problem Investigation','Problem Management', 'Major Problems','%s'),
		   (1, 'WOI:WorkOrder','Work Order', 'Number of Work Orders','%s'),
		   (1, 'TMS:Task','Task Management', 'Number of Tasks','%s'),
		   (1, 'RMS:Release','Release Management', 'Number of Releases','%s'),
		   (1, 'RKM:KnowledgeArticleManager','Knowledge Management', 'Number of Knowledge Articles','%s'),
		   (1, 'SRM:Request','Service Request Management', 'Number of Service Requests','%s'),
		   (1, 'AST:BaseElement','Asset Managements', 'Number of Assets','%s'),
		   (1, 'BMC.CORE:BMC_BaseElement','CMDB', 'Number of CI','%s')`,
			query1, query2, query3, query4, query5, query6, query7, query8, query9, query10, query11, query12, query13)),
	)

	// INSERT call with new id for 21.03.02
	mg.AddMigration("new fields in 21.03.02 calculatedfield",
		NewRawSQLMigration(fmt.Sprintf(`
		  INSERT INTO calculatedfield (org_id, form_name, module, name, sql_query)
		  VALUES(1, 'HPD:Help Desk','Incident Management', 'Avg MTTR in days','%s'),
		  (1, 'AST:CI Unavailability CI Join','Asset Availability', 'Avg MTBF in days','%s'),
		  (1, 'HPD:Help Desk','Incident Management', 'Avg MTTAcknowledge in days','%s')`,
			query14, query15, query16)),
	)

	mg.AddMigration("Update for id 14",
		NewRawSQLMigration(`
		 UPDATE calculatedfield SET name='MTTR in days' where id=14`),
	)

	mg.AddMigration("Update for id 15",
		NewRawSQLMigration(`
		 UPDATE calculatedfield SET name='MTBF in days' where id=15`),
	)

	mg.AddMigration("Update for id 16",
		NewRawSQLMigration(fmt.Sprintf(`
		 UPDATE calculatedfield SET name='MTTAcknowledge in hours',sql_query='%s' where id=16`, query16)),
	)
}
