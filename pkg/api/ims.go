package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/web"
)

var imsLog = log.New("ims_service")

type ImsUserInfo struct {
	UserId      string       `json:"user_id"`
	FirstName   string       `json:"first_name"`
	LastName    string       `json:"last_name"`
	FullName    string       `json:"full_name"`
	PrincipalId string       `json:"principal_id"`
	Email       string       `json:"email"`
	UserStatus  string       `json:"user_status"`
	Type        string       `json:"type"`
	AuthType    string       `json:"auth_type"`
	TenantId    string       `json:"tenant_id"`
	TenantName  string       `json:"tenant_name"`
	Roles       []string     `json:"roles"`
	Groups      []string     `json:"groups"`
	Permissions []string     `json:"permissions"`
	Preferences []Preference `json:"preferences"`
}

type Preference struct {
	Key   string `json:"key"`
	Level string `json:"level"`
	Value string `json:"value"`
}

func GetImsUserInfo(c *models.ReqContext) response.Response {
	//Fetch service account token
	jwtToken, err := GetIMSToken(c, c.OrgId, c.UserId)
	if err != nil {
		imsLog.Error(err.Error())
		return response.Error(http.StatusInternalServerError, "Internal server error", err)
	}
	//Fetch user info with preferences
	url := imsServiceURL + "/ims/api/v1/userinfo?preferences=true&gs_product_id=HelixDashboard"
	method := "GET"
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		imsLog.Error(err.Error())
		return response.Error(http.StatusInternalServerError, "Internal server error", err)
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+jwtToken)

	httpClient := &http.Client{}
	resp, err := httpClient.Do(req)
	if err != nil {
		imsLog.Error(err.Error())
		err := fmt.Errorf("failed to reach IMS service")
		return response.Error(http.StatusInternalServerError, "Internal server error", err)
	}

	defer resp.Body.Close()
	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		imsLog.Error(err.Error())
	}

	userInfo := ImsUserInfo{}
	if err := json.Unmarshal(bodyBytes, &userInfo); err != nil {
		imsLog.Error(err.Error())
		err := fmt.Errorf("failed to parse IMS service response")
		return response.Error(http.StatusInternalServerError, "Internal server error", err)
	}

	return response.JSON(http.StatusOK, userInfo)
}

func SetImsUserInfo(c *models.ReqContext) response.Response {
	preferences := make([]Preference, 0)
	if err := web.Bind(c.Req, &preferences); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}
	payload, err := json.Marshal(preferences)
	if err != nil {
		return response.Error(http.StatusBadRequest, "Failed parse body", err)
	}

	jwtToken, err := GetIMSToken(c, c.OrgId, c.UserId)
	if err != nil {
		imsLog.Error(err.Error())
		return response.Error(http.StatusInternalServerError, "Internal server error", err)
	}
	url := imsServiceURL + "/ims/api/v1/external/users/preferences"
	method := "POST"
	req, err := http.NewRequest(method, url, bytes.NewBuffer(payload))
	if err != nil {
		imsLog.Error(err.Error())
		return response.Error(http.StatusInternalServerError, "Internal server error", err)
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+jwtToken)

	httpClient := &http.Client{}
	resp, err := httpClient.Do(req)
	if err != nil {
		imsLog.Error(err.Error())
		err := fmt.Errorf("failed to reach IMS service")
		return response.Error(http.StatusInternalServerError, "Internal server error", err)
	}

	defer resp.Body.Close()
	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		imsLog.Error(err.Error())
	}

	return response.JSON(resp.StatusCode, string(bodyBytes))
}
