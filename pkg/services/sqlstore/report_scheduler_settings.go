package sqlstore

import (
	"context"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/models"
)

func init() {
	bus.AddHandlerCtx("sql", GetReportSettings)
	bus.AddHandlerCtx("sql", SetReportSettings)
	bus.AddHandlerCtx("sql", DeleteReportSettings)
}

func GetReportSettings(ctx context.Context, query *models.GetReportBranding) error {
	result := &models.ReportBranding{}
	_, err := x.Table("report_settings").
		Where("report_settings.org_id = ?", query.OrgId).
		Get(result)
	if err != nil {
		return err
	}
	query.Result = result
	return nil
}
func SetReportSettings(ctx context.Context, query *models.SetReportBranding) error {
	return inTransaction(func(sess *DBSession) error {
		result := &models.ReportBranding{}
		has, err := x.Table("report_settings").
			Where("report_settings.org_id = ?", query.OrgId).
			Get(result)
		if err != nil {
			return err
		}
		if !has {
			err := insertReportSettings(sess, query)
			if err != nil {
				return err
			}
		} else {
			err := updateReportSettings(sess, query)
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func DeleteReportSettings(ctx context.Context, query *models.DeleteReportBranding) error {
	return inTransaction(func(sess *DBSession) error {
		q := &models.SetReportBranding{
			OrgId: query.OrgId,
			Data: models.ReportBranding{
				LogoUrl:             "",
				FooterText:          "",
				FooterTextUrl:       "",
				FooterSentBy:        false,
				InternalDomainsOnly: false,
				WhitelistedDomains:  "",
			},
		}
		return updateReportSettings(sess, q)
	})
}

func insertReportSettings(sess *DBSession, query *models.SetReportBranding) error {
	_, err := sess.Table("report_settings").
		SetExpr("org_id", query.OrgId).
		Insert(query.Data)
	if err != nil {
		return err
	}
	return nil
}
func updateReportSettings(sess *DBSession, query *models.SetReportBranding) error {
	_, err := sess.Table("report_settings").
		Cols("company_logo_url", "footer_text",
			"footer_text_url", "footer_sent_by",
			"internal_domains_only", "whitelisted_domains").
		Where("report_settings.org_id = ?", query.OrgId).
		UseBool("footer_sent_by").
		UseBool("internal_domains_only").
		Nullable("company_logo_url", "footer_text",
			"footer_text_url", "footer_sent_by", "whitelisted_domains").
		Update(query.Data)
	if err != nil {
		return err
	}
	return nil
}
