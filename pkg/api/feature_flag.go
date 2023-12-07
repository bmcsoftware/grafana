package api

import (
	"encoding/json"
	"fmt"
	"github.bmc.com/DSOM-ADE/authz-go"
	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"io"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/setting"
)

// GlobalFeatureResponse type
type GlobalFeatureResponse struct {
	Features []Features `json:"features"`
}

// Features type
type Features struct {
	Name         string `json:"Name"`
	State        string `json:"State"`
	Status       bool   `json:"Status"`
	Solution     string `json:"Solution"`
	Description  string `json:"Description"`
	FeatureLevel string `json:"FeatureLevel"`
	ID           int    `json:"id"`
}

type TenantFeatureResponse struct {
	Tenantfeatures []Tenantfeatures `json:"tenantfeatures"`
}
type Tenantfeatures struct {
	Name         string `json:"Name"`
	State        string `json:"State,omitempty"`
	Status       bool   `json:"Status"`
	Solution     string `json:"Solution"`
	Description  string `json:"Description,omitempty"`
	FeatureLevel string `json:"FeatureLevel"`
	ID           int    `json:"id"`
	Tenant       string `json:"Tenant"`
	Disabled     bool   `json:"disabled,omitempty"`
}

func GetIMSToken(c *contextmodel.ReqContext, tenantId, userId int64) (string, error) {
	// Check if request has jwt set in headers
	jwtToken := c.Req.Header.Get("X-Jwt-Token")
	if jwtToken != "" {
		return jwtToken, nil
	}

	// Check if we have token set in cookies
	jwtCookie, _ := c.Req.Cookie("helix_jwt_token")
	if jwtCookie != nil {
		if jwtCookie.Value != "" {
			return jwtCookie.Value, nil
		}
	}

	// BMC change next block: To support IMS tenant 0
	if tenantId == setting.GF_Tenant0 {
		tenantId = setting.IMS_Tenant0
	}
	// Generate a new service account jwt
	serviceAccountToken, err := GetServiceAccountToken(tenantId)
	if err != nil {
		return "", fmt.Errorf("failed to get service account token")
	}

	// Generate a new user impersonation token
	impersonationToken, err := GetServiceImpersonationToken(userId, serviceAccountToken)
	if err != nil {
		return "", fmt.Errorf("failed to get impersonation token")
	}

	return impersonationToken, nil
}

// GetTenantFeatures GET /tenantfeatures - function
func (hs *HTTPServer) GetTenantFeatures(c *contextmodel.ReqContext) response.Response {
	if !setting.FeatureFlagEnabled {
		return response.JSON(200, []Tenantfeatures{})
	}
	imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
	if err != nil && setting.Env != "development" {
		return response.Error(401, "Failed to authenticate", err)
	}
	availableFeatures := GetTenantFeaturesFromService(c.OrgID, imsToken)
	return response.JSON(200, availableFeatures)
}

func GetTenantFeaturesFromService(tenantId int64, imsToken string) []Tenantfeatures {
	var logger = log.New("feature_flag")

	tenantFeatureResponse := TenantFeatureResponse{
		Tenantfeatures: make([]Tenantfeatures, 0),
	}

	tenantFeaturesURL := fmt.Sprintf("%s/tenantfeatures?Tenant=%d", setting.FeatureFlagEndpoint, tenantId)
	logger.Info("GetTenantFeaturesFromService URL:" + tenantFeaturesURL)

	client := http.Client{}
	req, _ := http.NewRequest("GET", tenantFeaturesURL, nil)
	req.Header.Add("Authorization", "Bearer "+imsToken)

	res, err := client.Do(req)
	if res != nil {
		logger.Info("GetTenantFeaturesFromService status:" + res.Status)
		if res.StatusCode != 200 {
			body, _ := ioutil.ReadAll(res.Body)
			defer res.Body.Close()
			if err != nil {
				logger.Info(string(body))
			}
			logger.Info("status is not 200 returning empty array", "status", res.Status)
			return tenantFeatureResponse.Tenantfeatures
		}
	} else {
		logger.Info("result set is null or tenant feature flag service is not available, returning empty array")
		return tenantFeatureResponse.Tenantfeatures
	}
	if err != nil {
		logger.Info(err.Error())
	}

	body, err := io.ReadAll(res.Body)
	defer res.Body.Close()
	if err != nil {
		logger.Info(err.Error())
	}
	if err := json.Unmarshal(body, &tenantFeatureResponse); err != nil {
		logger.Error("failed to unmarshal body")
	}
	return tenantFeatureResponse.Tenantfeatures
}

type FeatureFlag int

const (
	// FeatureFlagRMSMetadata is the feature flag for RMS Metadata
	FeatureFlagRMSMetadata FeatureFlag = iota

	// FeatureFlagGainSight is the feature flag for GainSight
	FeatureFlagGainSight

	// FeatureFlagDashboardBranding is the feature flag for Dashboard Branding
	FeatureFlagDashboardBranding

	// FeatureFlagReportingTypeHTML is the feature flag for HTML Reporting
	FeatureFlagReportingTypeHTML
)

func (feature FeatureFlag) String() string {
	switch feature {
	case FeatureFlagRMSMetadata:
		return "rms-metadata"
	case FeatureFlagGainSight:
		return "gainsight"
	case FeatureFlagDashboardBranding:
		return "branding"
	case FeatureFlagReportingTypeHTML:
		return "html-report"
	default:
		return ""
	}
}

func (feature FeatureFlag) Enabled(c *contextmodel.ReqContext) bool {
	if c.IsGrafanaAdmin {
		return true
	}

	if !setting.FeatureFlagEnabled {
		return true
	}

	if feature.String() == "" {
		return false
	}

	cacheInstance := authz.GetInstance()
	cacheKey := TenantFeatureCacheKey + strconv.Itoa(int(c.OrgID))
	if featureFlags, found := cacheInstance.Get(cacheKey); found {
		enabledFeatures := featureFlags.([]string)
		exists := false
		for _, val := range enabledFeatures {
			if val == feature.String() {
				exists = true
				break
			}
		}
		return exists
	} else {
		imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
		if err != nil && setting.Env != "development" {
			return false
		}
		tenantFeatures := GetTenantFeaturesFromService(c.OrgID, imsToken)
		featureFlags := make([]string, 0)
		m := make(map[string]bool)
		for _, tf := range tenantFeatures {
			if tf.Status && !m[tf.Name] {
				m[tf.Name] = true
				featureFlags = append(featureFlags, tf.Name)
			}
		}
		cacheInstance.Set(cacheKey, featureFlags, 120*time.Minute)
		return m[feature.String()]
	}
}
