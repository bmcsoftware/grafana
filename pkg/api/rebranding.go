// author (kmejdi)
package api

import (
	"io/ioutil"
	"net/http"
	"regexp"
	"strings"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/setting"

	"github.com/grafana/grafana/pkg/infra/log"
)

var rebrandingLogger = log.New("rebranding")

func GetTenantReBranding(c *models.ReqContext) response.Response {
	if !setting.FeatureFlagEnabled {
		return response.Respond(200, "").
			SetHeader("Content-Type", "text/css; charset=UTF-8")
	}

	imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
	if err != nil && setting.Env != "development" {
		return response.Error(401, "Failed to authenticate", err)
	}

	if setting.FeatureFlagEnabled {
		rebrandingFeature := false
		featureFlags := GetTenantFeaturesFromService(c.OrgID, imsToken)
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
	mainCss := getMainCss(imsToken)
	extractedCss := extract(mainCss, classNames)

	return response.Respond(200, extractedCss).SetHeader("Content-Type", "text/css; charset=UTF-8").
		SetHeader("Cache-Control", "public, max-age=31536000")
}

func getMainCss(imsToken string) string {
	fileKey := "/public/css/custom.css"
	url := setting.UcsEndpoint + fileKey
	method := "GET"
	rebrandingLogger.Info("Requesting custom css file",
		"url", url,
		"method", method,
	)
	client := &http.Client{}
	req, err := http.NewRequest(method, url, nil)

	req.Header.Add("Authorization", "Bearer "+imsToken)

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
