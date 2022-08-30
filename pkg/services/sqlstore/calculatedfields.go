/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by ateli at 10/02/2022
 */

package sqlstore

import (
	"context"
	"fmt"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
)

func init() {
	bus.AddHandlerCtx("sql", GetCalculatedFields)
}

func GetCalculatedFields(ctx context.Context, query *models.GetCalculatedFields) error {
	results := make([]*models.CalculatedFields, 0)
	sess := x.Table("calculatedfield")
	rawsql := "select t1.* from (" +
		"select cf.id,cf.org_id,cf.form_name,cf.module,cf.name,cf.sql_query,cf.aggregation, 'OOTB' as field_type  from calculatedfield cf " +
		"UNION ALL " +
		"select ccf.id,ccf.org_id,ccf.form_name,ccf.module,ccf.name,ccf.sql_query,ccf.aggregation, 'CUSTOM' as field_type  from custom_calculatedfields ccf" +
		") as t1 "
	rawsql += fmt.Sprintf(" WHERE t1.org_id in (1, %d)", query.OrgId)
	if err := sess.SQL(rawsql).Find(&results); err != nil {
		return err
	}
	query.Result = results
	return nil
}

func CreateCalculatedField(ctx context.Context, cmd *models.CreateCalcFieldCmd) error {
	sess := x.Table("custom_calculatedfields")
	_, err := sess.Insert(cmd)
	if err != nil {
		return err
	}
	return nil
}

func DeletelatedFields(ctx context.Context, cmd *models.DeleteCalcFieldsByIds) error {
	sess := x.Table("custom_calculatedfields")
	if _, err := sess.Table("custom_calculatedfields").
		Where("custom_calculatedfields.org_id = ?", cmd.OrgId).
		In("custom_calculatedfields.id", cmd.Ids).Delete(struct{}{}); err != nil {
		return err
	}

	return nil
}

func CheckForField(name string) error {
	results := make([]*models.CalculatedFields, 0)
	sess := x.Table("calculatedfield")
	rawsql := "select t1.* from (" +
		"select cf.name  from calculatedfield cf " +
		"UNION ALL " +
		"select ccf.name  from custom_calculatedfields ccf" +
		") as t1 "
	rawsql += fmt.Sprintf(" WHERE t1.name = '%s'", name)
	if err := sess.SQL(rawsql).Find(&results); err != nil {
		return err
	}
	if len(results) > 0 {
		return models.DuplicateFieldName
	}
	return nil
}
