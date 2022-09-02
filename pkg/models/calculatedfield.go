/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by abhasin at 03/08/2021
 */

package models

type CalculatedField struct {
	FormName string `xorm:"form_name"`
	Module   string `xorm:"module"`
	Name     string `xorm:"name"`
	SqlQuery string `xorm:"sql_query"`
}

type GetCalculatedField struct {
	OrgId  int64
	Result []*CalculatedField
}
