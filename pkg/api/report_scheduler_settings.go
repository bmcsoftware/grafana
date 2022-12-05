package api

import (
	"net/http"
	"strings"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

var logger = log.New("report_scheduler")

func (hs *HTTPServer) GetReportBrandingSettings(c *models.ReqContext) response.Response {
	result, err := hs.getReportSchedulerSettings(c)
	if err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(result)
}
func (hs *HTTPServer) getReportSchedulerSettings(c *models.ReqContext) (dtos.RSSettings, error) {
	query := &models.GetReportBranding{
		OrgId: c.OrgId,
	}
	if err := hs.SQLStore.GetReportSettings(c.Req.Context(), query); err != nil {
		return dtos.RSSettings{InternalDomainsOnly: true}, err
	}
	query.Result.LogoUrl = util.SanitizeHtml(query.Result.LogoUrl)
	query.Result.FooterText = util.SanitizeHtml(query.Result.FooterText)
	query.Result.FooterTextUrl = util.SanitizeHtml(query.Result.FooterTextUrl)
	domains := make([]string, 0)
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
		DateFormat:          query.Result.DateFormat,
	}, nil
}
func (hs *HTTPServer) SetReportBrandingSettings(c *models.ReqContext) response.Response {
	cmd := dtos.RSSettings{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	cmd.LogoUrl = util.SanitizeHtml(cmd.LogoUrl)
	cmd.FooterText = util.SanitizeHtml(cmd.FooterText)
	cmd.FooterTextUrl = util.SanitizeHtml(cmd.FooterTextUrl)
	// Verify and validate email domains,
	var validDomains []string
	for _, domain := range cmd.WhitelistedDomains {
		if util.DomainValidator(domain) {
			validDomains = append(validDomains, domain)
		} else {
			logger.Warn("Email domain " + domain + " is invalid")
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
			StorageRetention:    cmd.StorageRetention,
			DateFormat:          cmd.DateFormat,
		},
	}
	if err := hs.SQLStore.SetReportSettings(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return response.Success("Report branding is successfully updated.")
}
func (hs *HTTPServer) DeleteReportBrandingSettings(c *models.ReqContext) response.Response {
	query := &models.DeleteReportBranding{
		OrgId: c.OrgId,
	}

	if err := hs.SQLStore.DeleteReportSettings(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return response.Success("Report branding is set to default.")
}
