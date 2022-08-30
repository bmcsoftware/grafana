// author (kmejdi)
package api

import (
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/setting"
	"io/ioutil"
	"net/http"
	"regexp"
	"strings"

	"github.com/grafana/grafana/pkg/infra/log"
)

var rebrandingLogger = log.New("rebranding")

func GetTenantReBranding(c *models.ReqContext) response.Response {
	if setting.Env == "development" {
		return response.Respond(200, "").
			SetHeader("Content-Type", "text/css; charset=UTF-8")
	}

	if setting.FeatureFlagEnabled {
		rebrandingFeature := false
		featureFlags := GetTenantFeaturesFromService(c.OrgId)
		for i := range featureFlags {
			if featureFlags[i].Name == "branding" {
				rebrandingFeature = true
				break
			}
		}

		if !rebrandingFeature {
			return response.Respond(200, "").
				SetHeader("Content-Type", "text/css; charset=UTF-8")
		}
	}

	classNames := []string{
		".logo-bmc-helix", ".logo-bmc-helix.logo-light",
		".logo-helix", ".logo-helix.logo-light",
		".logo.logo-light", ".logo.logo-dark",
	}
	mainCss := getMainCss(c.OrgId)
	extractedCss := extract(mainCss, classNames)

	return response.Respond(200, extractedCss).SetHeader("Content-Type", "text/css; charset=UTF-8").
		SetHeader("Cache-Control", "public, max-age=31536000")
}

func getMainCss(tenantId int64) string {
	fileKey := "/public/css/custom.css"
	url := setting.UcsEndpoint + fileKey
	method := "GET"
	rebrandingLogger.Info("Requesting custom css file",
		"url", url,
		"method", method,
	)
	client := &http.Client{}
	req, err := http.NewRequest(method, url, nil)

	token, err := GetServiceAccountToken(tenantId)
	if err != nil {
		rebrandingLogger.Error("Failed to get service account token",
			"error", err.Error(),
		)
		return ""
	}
	req.Header.Add("Authorization", "Bearer "+token)

	res, err := client.Do(req)
	if err != nil {
		rebrandingLogger.Error("Failed to send a request to ucs service",
			"error", err.Error(),
		)
		return ""
	}
	defer res.Body.Close()

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		rebrandingLogger.Error("Failed to read body response",
			"error", err.Error(),
		)
		return ""
	}
	return string(body)
}

func extract(content string, classNames []string) string {
	rebrandingLogger.Info("Extracting needed classes from the custom css file")
	if content == "" {
		return ""
	}
	if len(classNames) == 0 {
		return ""
	}
	classes := parseCss(content)
	target := ""
	for _, class := range classes {
		for _, name := range classNames {
			if strings.Contains(class, name) {
				target = target + class + "\n"
				break
			}
		}
	}
	return target
}

func parseCss(content string) []string { // *regexp.Regexp {
	reg, err := regexp.Compile("([a-zA-Z_0-9 | -|:|;|\n\t]*)(\\{[\n\t]*[a-zA-Z_0-9 | -|:|;|\n\t]*\\})")
	if err != nil {
		return []string{}
	}
	return reg.FindAllString(content, -1)
}
