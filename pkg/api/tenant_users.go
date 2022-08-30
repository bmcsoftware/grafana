package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
)

var (
	imsServiceURL    = os.Getenv("IMS_SERVICE_URL")
	imsServiceAccKey = os.Getenv("IMS_SERVICE_ACCOUNT_KEY")
)

// Get Grafana and IMS Users, concatenate both and send them as a result
func getTenantUsers(ctx context.Context, orgID int64, query string, limit int) []*models.OrgUserDTO {
	var logger = log.New("ims_tenant_users")
	result := make([]*models.OrgUserDTO, 0)

	imsQuery := &models.GetOrgUsersQuery{OrgId: orgID, Query: query, Limit: limit}
	grafanaQuery := &models.GetOrgUsersQuery{OrgId: orgID, Query: query, Limit: limit}

	// Fetch IMS Users
	if err := getTenantUsersHelper(imsQuery); err != nil {
		logger.Error("Failed to fetch users", "reason", err.Error())
	} else {
		for _, user := range imsQuery.Result {
			result = append(result, user)
		}
	}
	//Fetching and filtering grafana users... since some of them has wrong email ids
	if err := bus.Dispatch(ctx, grafanaQuery); err != nil {
		logger.Error("Failed to fetch grafana users", "reason", err.Error())
	} else {
		for _, user := range grafanaQuery.Result {
			// If tenant email domain contains tenant id then email id should be invalid
			// and user will not be appended to list.
			if !strings.Contains(user.Email, strconv.FormatInt(user.OrgId, 10)) {
				result = append(result, user)
			}
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
	jsonData, err := json.Marshal(ImsSearchUserQuery{
		Filters: []ImsSearchUserFilters{
			{
				Field:  "*",
				Values: []string{data.Query},
			},
		},
	})
	if err != nil {
		return err
	}

	userSearchURL, err := url.Parse(imsServiceURL + "/ims/api/v1/users/search")
	if err != nil {
		return err
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

	result := make([]*models.OrgUserDTO, 0)
	for _, record := range imsUserResult.Records {
		orgId, _ := strconv.ParseInt(record.TenantID, 10, 64)
		userId, _ := strconv.ParseInt(record.UserID, 10, 64)
		user := &models.OrgUserDTO{
			OrgId:  orgId,
			UserId: userId,
			Email:  record.Email,
			Name:   record.FullName,
		}
		result = append(result, user)
	}
	data.Result = result
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
