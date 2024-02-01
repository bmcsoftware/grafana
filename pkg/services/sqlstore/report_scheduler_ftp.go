package sqlstore

import (
	"context"
	"github.com/grafana/grafana/pkg/models"
)

func (ss *SQLStore) GetFTPConfig(ctx context.Context, query *models.GetFTPConfig) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		results := make([]*models.FTPConfig, 0)

		sess := dbSession.Table("report_ftp_config").Where("report_ftp_config.org_id = ?", query.OrgId)

		if err := sess.Find(&results); err != nil {
			return err
		}
		if len(results) == 0 {
			query.Result = &models.FTPConfig{}
			return nil
		}
		query.Result = results[0]
		query.Result.HasPassword = query.Result.Password != ""
		query.Result.Password = ""
		return nil
	})
}

func (ss *SQLStore) SetFTPConfig(ctx context.Context, cmd *models.SetFTPConfigCmd) error {
	configQuery := &models.GetFTPConfig{OrgId: cmd.OrgID}
	err := ss.GetFTPConfig(ctx, configQuery)
	if err != nil {
		return err
	}

	if configQuery.Result.Id != 0 {
		err := ss.ModifyFTPConfig(ctx, &models.ModifyFTPConfigCmd{
			Id:       configQuery.Result.Id,
			OrgID:    cmd.OrgID,
			Host:     cmd.Host,
			Port:     cmd.Port,
			Username: cmd.Username,
			Password: cmd.Password,
		})
		return err
	}

	return ss.WithTransactionalDbSession(ctx, func(dbSession *DBSession) error {
		sess := dbSession.Table("report_ftp_config")
		_, err := sess.Insert(cmd)
		if err != nil {
			return err
		}
		return nil
	})
}

func (ss *SQLStore) ModifyFTPConfig(ctx context.Context, cmd *models.ModifyFTPConfigCmd) error {
	return ss.WithDbSession(ctx, func(dbSession *DBSession) error {
		modify := &models.ModifyFTPConfigCmd{
			Id:       cmd.Id,
			OrgID:    cmd.OrgID,
			Host:     cmd.Host,
			Port:     cmd.Port,
			Username: cmd.Username,
			Password: cmd.Password,
		}
		sess := dbSession.Table("report_ftp_config")
		if _, err := sess.Table("report_ftp_config").
			Where("report_ftp_config.org_id = ?", cmd.OrgID).Where("report_ftp_config.id = ?", cmd.Id).Update(modify); err != nil {
			return err
		}

		return nil
	})
}
