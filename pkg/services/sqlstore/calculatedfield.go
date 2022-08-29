/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by abhasin at 03/08/2021
 */

package sqlstore

import (
	"context"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
)

func init() {
	bus.AddHandler("sql", GetCalculatedField)
}

func GetCalculatedField(ctx context.Context, query *models.GetCalculatedField) error {
	results := make([]*models.CalculatedField, 0)

	sess := x.Table("calculatedfield").
		Where("calculatedfield.org_id in (1, ?)", query.OrgId)

	if err := sess.
		Find(&results); err != nil {
		return err
	}

	query.Result = results
	return nil
}
