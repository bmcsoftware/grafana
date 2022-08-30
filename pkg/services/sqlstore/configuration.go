/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by kmejdi at 29/7/2021
 */

package sqlstore

import (
	"context"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
)

func init() {
	bus.AddHandlerCtx("sql", GetCustomConfiguration)
	bus.AddHandlerCtx("sql", SetCustomConfiguration)
	bus.AddHandlerCtx("sql", ResetCustomConfiguration)
}

func GetCustomConfiguration(ctx context.Context, query *models.GetCustomConfiguration) error {
	result := &models.CustomConfiguration{}
	if has, err := x.Table("configuration").
		Where("configuration.org_id = ?", query.OrgId).
		Get(result); err != nil {
		return err
	} else {
		if !has {
			if _, err := x.Table("configuration").
				Where("configuration.org_id = 1").
				Get(result); err != nil {
				return err
			}
		}
	}
	query.Result = result
	return nil
}

func SetCustomConfiguration(ctx context.Context, query *models.SetCustomConfiguration) error {
	return inTransaction(func(sess *DBSession) error {
		result := &models.CustomConfiguration{}
		if has, err := x.Table("configuration").
			Where("configuration.org_id = ?", query.OrgId).
			Get(result); err != nil {
			return err
		} else {
			if !has {
				if err := insertConfiguration(sess, query); err != nil {
					return err
				}
			} else {
				if err := updateConfiguration(sess, query); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func ResetCustomConfiguration(ctx context.Context, query *models.RefreshCustomConfiguration) error {
	return inTransaction(func(sess *DBSession) error {
		_, err := sess.Table("configuration").
			Delete(query)
		if err != nil {
			return err
		}
		return nil
	})
}

func insertConfiguration(sess *DBSession, query *models.SetCustomConfiguration) error {
	_, err := sess.Table("configuration").
		SetExpr("org_id", query.OrgId).
		Insert(query.Data)
	if err != nil {
		return err
	}
	return nil
}

func updateConfiguration(sess *DBSession, query *models.SetCustomConfiguration) error {
	_, err := sess.Table("configuration").
		Where("configuration.org_id = ?", query.OrgId).
		Nullable("doc_link", "support_link", "community_link", "video_link").
		Update(query.Data)
	if err != nil {
		return err
	}
	return nil
}
