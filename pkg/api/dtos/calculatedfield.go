/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by abhasin at 03/08/2021
 */

package dtos

type CalculatedField struct {
	FormName    string `json:"formName"`
	Module      string `json:"module"`
	Name        string `json:"name"`
	SqlQuery    string `json:"sqlQuery"`
	Aggregation bool   `xorm:"aggregation"`
}
