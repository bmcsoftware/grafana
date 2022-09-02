package api

import (
	"encoding/json"
	"errors"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"net/http"
	"os"
	"strings"
)

var (
	imsServiceURL    = os.Getenv("IMS_SERVICE_URL")
	imsServiceAccKey = os.Getenv("IMS_SERVICE_ACCOUNT_KEY")
)

// Get Grafana and IMS Users, concatenate both and send them as a result
func getTenantUsers(orgID int64, query string, limit int) []*models.OrgUserDTO {
	result := make([]*models.OrgUserDTO, 0)

	imsQuery := &models.GetOrgUsersQuery{OrgId: orgID, Query: query, Limit: limit}
	grafanaQuery := &models.GetOrgUsersQuery{OrgId: orgID, Query: query, Limit: limit}

	// Fetch IMS Users
	if err := getTenantUsersHelper(imsQuery); err != nil {
		log.Infof("%v", err.Error())
	} else {
		for _, user := range imsQuery.Result {
			result = append(result, user)
		}
	}

	// Fetch Grafana Users
	if err := bus.Dispatch(grafanaQuery); err != nil {
		log.Infof("%v", err.Error())
	} else {
		for _, user := range grafanaQuery.Result {
			result = append(result, user)
		}
	}
	return result
}

func getTenantUsersHelper(data *models.GetOrgUsersQuery) error {

	if imsServiceURL == "" {
		return errors.New("IMS service URL is not set")
	}

	jwtToken, err := GetServiceAccountToken(data.OrgId)
	if err != nil {
		return err
	}

	if data.Limit == 0 {
		data.Limit = 1000
	}
	jsonData, err := json.Marshal(ImsTenantUsersSearchPayload{
		Size:  data.Limit,
		Order: "full_name",
		Query: ImsSearchUserQuery{
			Filters: []ImsSearchUserFilters{
				{
					Field:  "full_name",
					Values: []string{data.Query},
				},
			},
		},
	})
	if err != nil {
		return err
	}

	url := imsServiceURL + "/ims/api/v1/users"
	method := "POST"
	payload := strings.NewReader(string(jsonData))

	req, err := http.NewRequest(method, url, payload)
	if err != nil {
		return err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+jwtToken)

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	imsUserResult := ImsUserSearchResult{}
	err = json.NewDecoder(res.Body).Decode(&imsUserResult)
	if err != nil {
		return err
	}

	orgUserDTO := make([]*models.OrgUserDTO, 0)
	for _, record := range imsUserResult.Records {
		user := &models.OrgUserDTO{
			OrgId:  record.TenantID,
			UserId: record.UserID,
			Email:  record.Email,
			Name:   record.FullName,
		}
		orgUserDTO = append(orgUserDTO, user)
	}
	data.Result = orgUserDTO
	return nil
}

func GetServiceAccountToken(tenantId int64) (string, error) {

	if imsServiceAccKey == "" {
		return "", errors.New("IMS service account key is not set")
	}

	jsonData, err := json.Marshal(ImsServicePayload{
		TenantId:          tenantId,
		ServiceAccountKey: imsServiceAccKey,
		RoleNames:         []string{"Impersonator"},
	})
	if err != nil {
		return "", err
	}

	url := imsServiceURL + "/ims/api/internal/v1/auth/service_accounts/tokens"
	method := "POST"
	payload := strings.NewReader(string(jsonData))

	req, err := http.NewRequest(method, url, payload)
	if err != nil {
		return "", err
	}
	req.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	jwt := JsonWebToken{}
	err = json.NewDecoder(res.Body).Decode(&jwt)
	if err != nil {
		return "", err
	}
	return jwt.JsonWebToken, nil
}

type JsonWebToken struct {
	JsonWebToken string `json:"json_web_token"`
}

type ImsTenantUsersSearchPayload struct {
	Page  int                `json:"page"`
	Size  int                `json:"size"`
	Order string             `json:"orderBy"`
	Query ImsSearchUserQuery `json:"searchFilterUserRequest"`
}
type ImsSearchUserQuery struct {
	Filters []ImsSearchUserFilters `json:"filters"`
}
type ImsSearchUserFilters struct {
	Field  string   `json:"field"`
	Values []string `json:"values"`
}

type ImsServicePayload struct {
	TenantId          int64    `json:"tenant_id"`
	ServiceAccountKey string   `json:"service_account_key"`
	RoleNames         []string `json:"role_names"`
}

type ImsUserSearchResult struct {
	Records []struct {
		TenantID int64  `json:"tenant_id"`
		UserID   int64  `json:"user_id"`
		Email    string `json:"email"`
		FullName string `json:"full_name"`
	} `json:"records"`
}
