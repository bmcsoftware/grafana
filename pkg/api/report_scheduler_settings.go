package api

import (
	"net/http"
	"strings"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	kp "github.com/grafana/grafana/pkg/bmc/kafkaproducer"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

var logger = log.New("report_scheduler")

func (hs *HTTPServer) GetReportBrandingSettings(c *contextmodel.ReqContext) response.Response {
	result, err := hs.getReportSchedulerSettings(c)
	if err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(result)
}

func (hs *HTTPServer) getReportSchedulerSettings(c *contextmodel.ReqContext) (dtos.RSSettings, error) {
	query := &models.GetReportBranding{
		OrgId: c.OrgID,
	}
	if err := hs.sqlStore.GetReportSettings(c.Req.Context(), query); err != nil {
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

func (hs *HTTPServer) SetReportBrandingSettings(c *contextmodel.ReqContext) response.Response {
	preValue, err := hs.getReportSchedulerSettings(c)
	if err != nil {
		logger.Error("Failed to get previous report branding settings")
	}
	cmd := dtos.RSSettings{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	if cmd.LogoUrl != "" && !util.IsValidImageURL(cmd.LogoUrl) {
		err := "Invalid image URL. Only the following extensions are allowed: .png, .jpg, .jpeg"
		return response.Error(http.StatusBadRequest, err, nil)
	}

	if valid := util.ValidateUrlScheme(cmd.LogoUrl); cmd.LogoUrl != "" && !valid {
		return response.Error(http.StatusBadRequest, "Invalid logo URL", nil)
	}

	if cmd.FooterTextUrl != "" && !util.ValidateUrlScheme(cmd.FooterTextUrl) {
		return response.Error(http.StatusBadRequest, "Invalid footer URL", nil)
	}

	cmd.LogoUrl = util.SanitizeHtml(cmd.LogoUrl)
	cmd.FooterText = util.SanitizeHtml(cmd.FooterText)
	cmd.FooterTextUrl = util.SanitizeHtml(cmd.FooterTextUrl)
	// Verify and validate email domains
	var validDomains []string
	for _, domain := range cmd.WhitelistedDomains {
		if util.DomainValidator(domain) {
			validDomains = append(validDomains, domain)
		} else {
			logger.Warn("Email domain " + domain + " is invalid")
		}
	}
	query := &models.SetReportBranding{
		OrgId: c.OrgID,
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
	if err := hs.sqlStore.SetReportSettings(c.Req.Context(), query); err != nil {
		kp.ReportBrandingSettingsEvent.Send(kp.EventOpt{Ctx: c, Err: err, OperationSubType: "Failed to update branding setting with error: " + err.Error()})
		return hs.FailResponse(err)
	}

	newValue, err := hs.getReportSchedulerSettings(c)
	if err != nil {
		logger.Error("Failed to get updated report branding settings")
	}

	kp.ReportBrandingSettingsEvent.Send(kp.EventOpt{Ctx: c, Prev: preValue, New: newValue, OperationSubType: "Report branding is successfully updated"})

	return response.Success("Report branding is successfully updated.")
}
func (hs *HTTPServer) DeleteReportBrandingSettings(c *contextmodel.ReqContext) response.Response {
	query := &models.DeleteReportBranding{
		OrgId: c.OrgID,
	}

	if err := hs.sqlStore.DeleteReportSettings(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return response.Success("Report branding is set to default.")
}
