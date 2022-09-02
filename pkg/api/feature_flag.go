package api

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"

	"github.com/grafana/grafana/pkg/api/response"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/setting"
)

// GlobalFeatureResponse type
type GlobalFeatureResponse struct {
	Features []Features `json:"features"`
}

//Features type
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

// GET /tenantfeatures - function
func (hs *HTTPServer) GetTenantFeatures(c *models.ReqContext) response.Response {
	var tenantId = c.OrgId
	availableFeatures := GetTenantFeaturesFromService(tenantId)
	return response.JSON(200, availableFeatures)
}

func GetTenantFeaturesFromService(tenantId int64) []Tenantfeatures {
	var logger = log.New("feature_flag")
	if !setting.FeatureFlagEnabled {
		var emptyResponse TenantFeatureResponse
		emptyResponse.Tenantfeatures = make([]Tenantfeatures, 0)
		return emptyResponse.Tenantfeatures
	} else {
		logger.Info("GetTenantFeaturesFromService URL:" + setting.FeatureFlagEndpoint + "/tenantfeatures?Solution=dashboards&Tenant=" + strconv.Itoa(int(tenantId)))

		client := http.Client{}
		req, _ := http.NewRequest("GET", setting.FeatureFlagEndpoint+"/tenantfeatures?Solution=dashboards&Tenant="+strconv.Itoa(int(tenantId)), nil)

		token, err := GetServiceAccountToken(tenantId)
		if err != nil {
			logger.Error("Failed to get token", "status", "500")
			var emptyResponse TenantFeatureResponse
			emptyResponse.Tenantfeatures = make([]Tenantfeatures, 0)
			return emptyResponse.Tenantfeatures
		}

		req.Header.Add("Authorization", "Bearer "+token)

		res, err := client.Do(req)
		if res != nil {
			logger.Info("GetTenantFeaturesFromService status:" + res.Status)
			if res.StatusCode != 200 {
				logger.Info(res.Status)
				logger.Info("status is not 200 returning empty array")
				var emptyResponse TenantFeatureResponse
				emptyResponse.Tenantfeatures = make([]Tenantfeatures, 0)
				return emptyResponse.Tenantfeatures
			}
		} else {
			logger.Info("result set is null or tenant feature flag service is not available, returning empty array")
			var emptyResponse TenantFeatureResponse
			emptyResponse.Tenantfeatures = make([]Tenantfeatures, 0)
			return emptyResponse.Tenantfeatures
		}
		if err != nil {
			logger.Info(err.Error())
		}

		body, err := ioutil.ReadAll(res.Body)

		if err != nil {
			logger.Info(err.Error())
		}

		var data TenantFeatureResponse
		json.Unmarshal(body, &data)
		return data.Tenantfeatures
	}

}
