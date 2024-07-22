package rmsmetadataimpl

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/rmsmetadata"
	"github.com/grafana/grafana/pkg/services/sqlstore/migrator"
	"github.com/grafana/grafana/pkg/setting"
)

type store interface {
	GetView(context.Context, int64) ([]*rmsmetadata.View, error)
	GetViewById(context.Context, int64, int64) (*rmsmetadata.View, error)
}

type sqlStore struct {
	db      db.DB
	dialect migrator.Dialect
	log     log.Logger
	cfg     *setting.Cfg
}

func (ss *sqlStore) GetView(ctx context.Context, orgID int64) ([]*rmsmetadata.View, error) {
	var results []*rmsmetadata.View
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {
		sess := dbSess.Table("rms_metadata_view_list")
		err := sess.Where("tenant_id in (?,1)", orgID).Find(&results)
		if err != nil {
			return err
		}
		if len(results) == 0 {
			return rmsmetadata.ErrViewNotFound
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return results, nil
}

func (ss *sqlStore) GetViewById(ctx context.Context, orgID int64, viewID int64) (*rmsmetadata.View, error) {
	var result rmsmetadata.View
	err := ss.db.WithDbSession(ctx, func(dbSess *db.Session) error {
		sess := dbSess.Table("rms_metadata_view_list")
		_, err := sess.Where("tenant_id in (?,1)", orgID).Where("id = ?", viewID).Get(&result)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}
