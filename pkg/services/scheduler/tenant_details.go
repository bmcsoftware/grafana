package reporting_scheduler

import (
	"encoding/json"
	"fmt"
	"github.com/grafana/grafana/pkg/api/dtos"
	"net/http"
)

func GetTenantDetails(orgId int64) (*dtos.TenantDetails, error) {
	url := fmt.Sprintf("http://tms:8000/tms/api/v1/tenants/%v", orgId)
	tenantDetails := &dtos.TenantDetails{}
	err := getJson(url, tenantDetails)
	if err != nil {
		return nil, err
	}
	return tenantDetails, nil
}

func getJson(url string, target interface{}) error {
	client := &http.Client{}
	r, err := client.Get(url)
	if err != nil {
		return err
	}
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(target)
}
