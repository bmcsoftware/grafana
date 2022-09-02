package api

import (
	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"
	"strings"
)

func GetReportBrandingSettings(c *models.ReqContext) response.Response {
	result, err := getReportSchedulerSettings(c.OrgId)
	if err != nil {
		return FailResponse(err)
	}
	return SuccessResponse(result)
}

func getReportSchedulerSettings(orgId int64) (dtos.RSSettings, error) {
	query := &models.GetReportBranding{
		OrgId: orgId,
	}
	if err := bus.Dispatch(query); err != nil {
		return dtos.RSSettings{InternalDomainsOnly: true}, err
	}

	query.Result.LogoUrl = util.SanitizeHtml(query.Result.LogoUrl)
	query.Result.FooterText = util.SanitizeHtml(query.Result.FooterText)
	query.Result.FooterTextUrl = util.SanitizeHtml(query.Result.FooterTextUrl)

	domains := []string{}
	if query.Result.WhitelistedDomains != "" {
		domains = strings.Split(query.Result.WhitelistedDomains, ";")
	}

	return dtos.RSSettings{
		LogoUrl:             query.Result.LogoUrl,
		FooterText:          query.Result.FooterText,
		FooterTextUrl:       query.Result.FooterTextUrl,
		FooterSentBy:        query.Result.FooterSentBy,
		InternalDomainsOnly: query.Result.InternalDomainsOnly,
		WhitelistedDomains:  domains,
	}, nil
}

func SetReportBrandingSettings(c *models.ReqContext, cmd dtos.RSSettings) response.Response {

	cmd.LogoUrl = util.SanitizeHtml(cmd.LogoUrl)
	cmd.FooterText = util.SanitizeHtml(cmd.FooterText)
	cmd.FooterTextUrl = util.SanitizeHtml(cmd.FooterTextUrl)

	// Verify and validate email domains,
	var validDomains []string
	for _, domain := range cmd.WhitelistedDomains {
		if util.DomainValidator(domain) {
			validDomains = append(validDomains, domain)
		} else {
			log.Warnf("Email domain '%v' is invalid", domain)
		}
	}

	query := &models.SetReportBranding{
		OrgId: c.OrgId,
		Data: models.ReportBranding{
			LogoUrl:             cmd.LogoUrl,
			FooterText:          cmd.FooterText,
			FooterTextUrl:       cmd.FooterTextUrl,
			FooterSentBy:        cmd.FooterSentBy,
			InternalDomainsOnly: cmd.InternalDomainsOnly,
			WhitelistedDomains:  strings.Join(validDomains, ";"),
		},
	}

	if err := bus.Dispatch(query); err != nil {
		return FailResponse(err)
	}

	return response.Success("Report branding is successfully updated.")
}

func DeleteReportBrandingSettings(c *models.ReqContext) response.Response {
	query := &models.DeleteReportBranding{
		OrgId: c.OrgId,
	}
	if err := bus.Dispatch(query); err != nil {
		return FailResponse(err)
	}
	return response.Success("Report branding is set to default.")
}
