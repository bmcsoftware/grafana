package external

import (
	"encoding/json"
	"fmt"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/setting"
	"io"
	"net/http"
)

// GetTenantFeatures GET /tenantfeatures
func getTenantFeatures(c *models.ReqContext) ([]TenantFeatures, error) {
	if !setting.FeatureFlagEnabled {
		return []TenantFeatures{}, nil
	}
	imsToken, err := getIMSToken(c, c.OrgID, c.UserID)
	if err != nil {
		return []TenantFeatures{}, err
	}
	availableFeatures := _getTenantFeatures(c.OrgID, imsToken)
	return availableFeatures, nil
}

func _getTenantFeatures(tenantId int64, imsToken string) []TenantFeatures {
	log := logger.New("service", "feature.flags")

	tenantFeatureResponse := TenantFeatureResponse{
		TenantFeatures: make([]TenantFeatures, 0),
	}

	tenantFeaturesURL := fmt.Sprintf("%s/tenantfeatures?Tenant=%d", setting.FeatureFlagEndpoint, tenantId)

	client := http.Client{}
	req, err := http.NewRequest("GET", tenantFeaturesURL, nil)
	if err != nil {
		log.Error("Error creating request", "error", err)
		return tenantFeatureResponse.TenantFeatures
	}

	req.Header.Add("Authorization", "Bearer "+imsToken)

	res, err := client.Do(req)

	if err != nil {
		log.Error("failed to fetch tenant feature flags", "error", err)
		return tenantFeatureResponse.TenantFeatures
	}

	body, err := io.ReadAll(res.Body)
	defer res.Body.Close()

	if err != nil {
		log.Error("failed to read response body", "error", err)
		return tenantFeatureResponse.TenantFeatures
	}

	if err := json.Unmarshal(body, &tenantFeatureResponse); err != nil {
		log.Error("failed to unmarshal body", "error", err)
		return tenantFeatureResponse.TenantFeatures
	}

	return tenantFeatureResponse.TenantFeatures
}

type GlobalFeatureResponse struct {
	Features []Features `json:"features"`
}

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
	TenantFeatures []TenantFeatures `json:"tenantfeatures"`
}

type TenantFeatures struct {
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
