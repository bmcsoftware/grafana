/*
 * Copyright (C) 2022 BMC Software Inc
 * Added by ymulthan at 4/12/2022
 */

package sqlstore

import (
	"context"
	"fmt"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
)

func init() {
	bus.AddHandler("sql", GetFeatureStatus)
	bus.AddHandler("sql", SetFeatureStatus)
}

func GetFeatureStatus(ctx context.Context, query *models.GetFeatureStatus) error {
	result := make([]*models.FeatureStatus, 0)
	sess := x.Table("feature_status")
	rawSql := "select t1.* from feature_status as t1"
	rawSql += fmt.Sprintf(" WHERE t1.org_id in (1, %d)", query.OrgId)

	if err := sess.SQL(rawSql).Find(&result); err != nil {
		return err
	}
	query.Result = result
	return nil
}

func SetFeatureStatus(ctx context.Context, query *models.SetFeatureStatus) error {
	return inTransaction(func(sess *DBSession) error {
		result := &models.FeatureStatus{}
		if has, err := x.Table("feature_status").
			Where("feature_status.org_id = ?", query.OrgId).
			Where("feature_status.feature_name = ?", query.Data.FeatureName).
			Get(result); err != nil {
			return err
		} else {
			if !has {
				if has, err := x.Table("feature_status").
					Where("feature_status.feature_name = ?", query.Data.FeatureName).
					Get(result); err != nil {
					return err
				} else {
					if has {
						if err := insertFeature(sess, query); err != nil {
							return err
						}
					}
				}
			} else {
				if err := updateFeature(sess, query); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func insertFeature(sess *DBSession, query *models.SetFeatureStatus) error {
	_, err := sess.Table("feature_status").
		SetExpr("org_id", query.OrgId).
		Insert(query.Data)
	if err != nil {
		return err
	}
	return nil
}

func updateFeature(sess *DBSession, query *models.SetFeatureStatus) error {
	session := sess.Table("feature_status")
	rawSql := fmt.Sprintf(`update feature_status SET status=%t where org_id=%d and feature_name='%s'`,
		query.Data.Status, query.OrgId, query.Data.FeatureName)
	if _, err := session.Exec(rawSql); err != nil {
		return err
	}
	return nil
}

func IsFeatureEnabled(orgId int64, featureName string) bool {
	result := &models.FeatureStatus{}
	if has, err := x.Table("feature_status").
		Where("feature_status.org_id = ?", orgId).
		Where("feature_status.feature_name = ?", featureName).
		Get(result); err != nil {
		return false
	} else {
		if !has {
			// Get Default status of feature (from Main org)
			if has, err := x.Table("feature_status").
				Where("feature_status.org_id = 1").
				Where("feature_status.feature_name = ?", featureName).
				Get(result); err != nil {
				return false
			} else {
				if !has {
					return false
				} else {
					return result.Status
				}
			}
		} else {
			return result.Status
		}
	}
}
