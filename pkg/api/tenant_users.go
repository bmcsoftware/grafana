package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/org"
)

var (
	imsServiceURL    = os.Getenv("IMS_SERVICE_URL")
	imsServiceAccKey = os.Getenv("IMS_SERVICE_ACCOUNT_KEY")
)

// Get Grafana and IMS Users, concatenate both and send them as a result
func (hs *HTTPServer) getTenantUsers(ctx context.Context, orgID int64, query string, limit int) []*org.OrgUserDTO {
	var logger = log.New("ims_tenant_users")
	result := make([]*org.OrgUserDTO, 0)

	imsQuery := &org.GetOrgUsersQuery{OrgID: orgID, Query: query, Limit: limit}
	grafanaQuery := &org.GetOrgUsersQuery{OrgID: orgID, Query: query, Limit: limit}

	// Fetch IMS Users
	imsQueryResult, err := getTenantUsersHelper(imsQuery)
	if err != nil {
		logger.Error("Failed to fetch users", "reason", err.Error())
	} else {
		for _, user := range imsQueryResult {
			result = append(result, user)
		}
	}
	//Fetching and filtering grafana users... since some of them has wrong email ids
	grafanaQueryResult, err := hs.orgService.GetOrgUsers(ctx, grafanaQuery)
	if err != nil {
		logger.Error("Failed to fetch grafana users", "reason", err.Error())
	} else {
		for _, user := range grafanaQueryResult {
			// If tenant email domain contains tenant id then email id should be invalid
			// and user will not be appended to list.
			if !strings.Contains(user.Email, strconv.FormatInt(user.OrgID, 10)) {
				result = append(result, user)
			}
		}
	}
	return result
}

func getTenantUsersHelper(data *org.GetOrgUsersQuery) ([]*org.OrgUserDTO, error) {

	if imsServiceURL == "" {
		return nil, errors.New("IMS service URL is not set")
	}

	jwtToken, err := GetServiceAccountToken(data.OrgID)
	if err != nil {
		return nil, err
	}

	if data.Limit == 0 {
		data.Limit = 1000
	}
	jsonData, err := json.Marshal(ImsSearchUserQuery{
		Filters: []ImsSearchUserFilters{
			{
				Field:  "*",
				Values: []string{data.Query},
			},
		},
	})
	if err != nil {
		return nil, err
	}

	userSearchURL, err := url.Parse(imsServiceURL + "/ims/api/v1/users/search")
	if err != nil {
		return nil, err
	}
	queryParams := userSearchURL.Query()
	queryParams.Add("page", "0")
	queryParams.Add("size", strconv.Itoa(data.Limit))
	queryParams.Add("orderBy", "full_name")
	queryParams.Add("sortOrder", "asc")

	userSearchURL.RawQuery = queryParams.Encode()

	method := "POST"
	payload := strings.NewReader(string(jsonData))
	req, err := http.NewRequest(method, userSearchURL.String(), payload)

	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+jwtToken)

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	imsUserResult := ImsUserSearchResult{}
	err = json.NewDecoder(res.Body).Decode(&imsUserResult)
	if err != nil {
		return nil, err
	}

	result := make([]*org.OrgUserDTO, 0)
	for _, record := range imsUserResult.Records {
		orgId, _ := strconv.ParseInt(record.TenantID, 10, 64)
		userId, _ := strconv.ParseInt(record.UserID, 10, 64)
		user := &org.OrgUserDTO{
			OrgID:  orgId,
			UserID: userId,
			Email:  record.Email,
			Name:   record.FullName,
		}
		result = append(result, user)
	}

	return result, nil
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

	if res.StatusCode != 200 {
		return "", fmt.Errorf("unauthorized")
	}

	jwt := JsonWebToken{}
	err = json.NewDecoder(res.Body).Decode(&jwt)
	if err != nil {
		return "", err
	}
	return jwt.JsonWebToken, nil
}

func GetServiceImpersonationToken(userId int64, jwtToken string) (string, error) {
	jsonData, err := json.Marshal(ImsImpersonatePayload{
		UserId: userId,
	})
	if err != nil {
		return "", err
	}

	url := imsServiceURL + "/ims/api/internal/v1/auth/users/impersonate"
	method := "POST"
	payload := strings.NewReader(string(jsonData))

	req, err := http.NewRequest(method, url, payload)
	if err != nil {
		return "", err
	}
	req.Header.Add("Authorization", "Bearer "+jwtToken)
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

type ImsImpersonatePayload struct {
	UserId int64 `json:"user_id"`
}

type JsonWebToken struct {
	JsonWebToken string `json:"json_web_token"`
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
		TenantID string `json:"tenant_id"`
		UserID   string `json:"user_id"`
		Email    string `json:"email"`
		FullName string `json:"full_name"`
	} `json:"records"`
}
