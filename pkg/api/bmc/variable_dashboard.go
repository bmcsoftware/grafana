// variable_dashboard.go
package bmc

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.bmc.com/DSOM-ADE/authz-go"
	model "github.com/grafana/grafana/pkg/api/bmc/bhd_external"
	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	dbstore "github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/web"
)

func (p *PluginsAPI) getAllDashboards(c *contextmodel.ReqContext) response.Response {
	model.Log.Info("From get all Dashboards", "info")

	imsJWTToken := c.Req.Header.Get("IMS-JWT")

	if imsJWTToken == "" {
		model.Log.Error("Missing or Empty Authorization Header", "error")
		return response.Error(http.StatusUnauthorized, "Missing or Empty Authorization Header", nil)
	}

	permissions := []string{"*", "reporting.dashboards_permissions.admin", "reporting.dashboards_permissions.editor"}

	// Check for permissions only
	allowed, err := authz.AuthorizePermissions(imsJWTToken, permissions, "")
	if err != nil {
		model.Log.Error("IMS_JWT is invalid", "error")
		return response.Error(http.StatusUnauthorized, "IMS_JWT is invalid", err)
	}
	if !allowed {
		model.Log.Error("User doesn't have required permissions", "error")
		return response.Error(http.StatusUnauthorized, "User doesn't have enough permissions", nil)
	}

	//Calling Authorize to fetch userObject
	usrObj, err := authz.Authorize(imsJWTToken)
	if err != nil {
		model.Log.Error("IMS_JWT is invalid or incorrect", "error")
		return response.Error(http.StatusUnauthorized, "IMS_JWT is invalid or incorrect", err)
	}

	model.Log.Debug("User with tenantID " + usrObj.Tenant_Id + " is authenticated and authorized!!!")

	orgId, _ := strconv.ParseInt(usrObj.Tenant_Id, 10, 64)

	params := model.DashboardQueryParams{
		FolderName: c.Query("folder_name"),
		Tags:       c.Query("tags"),
		OrgID:      orgId,
	}

	model.Log.Info("Fetching dashboard details",
		"info", map[string]interface{}{
			"TenantID":   orgId,
			"FolderName": params.FolderName,
			"Tags":       params.Tags,
		},
	)

	sqlBuilder := strings.Builder{}
	sqlBuilder.WriteString(`
		SELECT
			dashboard.uid,
			dashboard.title,
			dashboard.data::json->>'tags' AS tags,
			dashboard.folder_id,
			folder.title AS folder_title,
			dashboard.created,
			dashboard.updated,
			dashboard.created_by,
			dashboard.updated_by
		FROM
			dashboard
		LEFT OUTER JOIN
			dashboard AS folder ON folder.id = dashboard.folder_id
		WHERE
			NOT dashboard.is_folder
			AND dashboard.is_folder = false
	`)

	// Build dynamic conditions based on provided query parameters
	paramsList := make([]interface{}, 0)
	if params.FolderName != "" {
		sqlBuilder.WriteString(" AND folder.title COLLATE \"C\" ILIKE ?")
		paramsList = append(paramsList, "%"+params.FolderName+"%")
	}

	if params.Tags != "" {
		// Split comma-separated tags
		tags := strings.Split(params.Tags, ",")
		tagConditions := make([]string, len(tags))

		// Build individual OR conditions for each tag
		for i, tag := range tags {
			tagConditions[i] = "dashboard.data::jsonb->'tags' @> ?::jsonb"
			paramsList = append(paramsList, fmt.Sprintf(`["%s"]`, tag))
		}

		// Join the individual OR conditions with OR operators
		orCondition := strings.Join(tagConditions, " OR ")

		// Append the combined AND condition with OR clauses to the SQL query
		sqlBuilder.WriteString(" AND (" + orCondition + ")")
	}

	if params.OrgID != 0 {
		sqlBuilder.WriteString(" AND dashboard.org_id = ?")
		paramsList = append(paramsList, params.OrgID)
	}

	// Execute SQL query using the store
	var dashboards []model.Dashboard
	err = p.store.WithDbSession(c.Req.Context(), func(sess *dbstore.DBSession) error {
		return sess.SQL(sqlBuilder.String(), paramsList...).Find(&dashboards)
	})

	if err != nil {
		model.Log.Debug("TenantId: "+usrObj.Tenant_Id+" Error occured while querying datatbase ", "debug")
		return response.Error(http.StatusInternalServerError, "Internal Server Error", err)
	}
	// Log the number of dashboards retrieved
	model.Log.Info("Number of dashboards retrieved:", "info", len(dashboards))

	// Create the response structure
	responseData := map[string]interface{}{
		"statusCode":    "200",
		"statusMessage": "Success",
		"response": map[string]interface{}{
			"dashboardList": dashboards,
		},
	}
	model.Log.Info("TenantId: " + usrObj.Tenant_Id + " About to return success response for getalldashboards")
	return response.JSON(http.StatusOK, responseData)
}

func (p *PluginsAPI) getVariablesMetadata(c *contextmodel.ReqContext) response.Response {
	uid := web.Params(c.Req)[":uid"]
	model.Log.Info("From get all Dashboards", "info")

	imsJWTToken := c.Req.Header.Get("IMS-JWT")

	if imsJWTToken == "" {
		model.Log.Error("Missing or Empty Authorization Header", "error")
		return response.Error(http.StatusUnauthorized, "Missing or Empty Authorization Header", nil)
	}

	permissions := []string{"*", "reporting.dashboards_permissions.admin", "reporting.dashboards_permissions.editor"}

	// Check for permissions only
	allowed, err := authz.AuthorizePermissions(imsJWTToken, permissions, "")
	if err != nil {
		model.Log.Error("IMS_JWT is invalid", "error")
		return response.Error(http.StatusUnauthorized, "IMS_JWT is invalid", err)
	}
	if !allowed {
		model.Log.Error("User doesn't have required permissions", "error")
		return response.Error(http.StatusUnauthorized, "User doesn't have enough permissions", nil)
	}

	//Calling Authorize to fetch userObject
	usrObj, err := authz.Authorize(imsJWTToken)
	if err != nil {
		model.Log.Error("IMS_JWT is invalid or incorrect", "error")
		return response.Error(http.StatusUnauthorized, "IMS_JWT is invalid or incorrect", err)
	}

	model.Log.Debug("User with tenantID " + usrObj.Tenant_Id + " is authenticated and authorized!!!")
	orgId, _ := strconv.ParseInt(usrObj.Tenant_Id, 10, 64)

	model.Log.Info("Fetching variables for dashboard with ",
		"info", map[string]interface{}{
			"TenantID": orgId,
			"uid":      uid,
		},
	)

	sqlBuilder := strings.Builder{}
	sqlBuilder.WriteString(`
	SELECT
	dashboard.uid,
	dashboard.title,
	dashboard.data
	FROM
	dashboard
	LEFT OUTER JOIN
	dashboard AS folder ON folder.id = dashboard.folder_id
		WHERE
	NOT dashboard.is_folder
	AND dashboard.is_folder = false
	`)
	paramsList := make([]interface{}, 0)
	if uid != "" {
		sqlBuilder.WriteString(" AND dashboard.uid = ?")
		paramsList = append(paramsList, uid)
	}
	if orgId != 0 {
		sqlBuilder.WriteString(" AND dashboard.org_id = ?")
		paramsList = append(paramsList, orgId)
	}

	var dashboard model.DashboardById
	var responseErr *response.NormalResponse
	err = p.store.WithDbSession(c.Req.Context(), func(sess *dbstore.DBSession) error {
		isRecordFound, sqlErr := sess.SQL(sqlBuilder.String(), paramsList...).Get(&dashboard)

		if sqlErr != nil {
			model.Log.Debug("TenantId: "+usrObj.Tenant_Id+" Error occured while querying datatbase ", "debug")
			responseErr = response.Error(http.StatusInternalServerError, "Internal Server Error", sqlErr)
			return sqlErr
		} else if !isRecordFound {
			responseErr = response.Error(http.StatusNotFound, "Record not found", nil)
			return nil
		}

		return nil
	})

	if responseErr != nil {
		return responseErr
	}

	if err != nil {
		return response.Error(http.StatusInternalServerError, "Internal Server Error", err)
	}
	// Continue with the rest of the code, assuming the record was found
	templatingArray, err := getTemplatingArray(&dashboard)

	if err != nil {
		return response.Error(http.StatusInternalServerError, "Internal Server Error", err)
	}
	title, err := getTitle(&dashboard)
	if err != nil {
		return response.Error(http.StatusInternalServerError, "Internal Server Error", err)
	}

	var variables []model.Variable
	variableCount := 0
	for _, item := range templatingArray {
		metadata := processTemplatingItem(item)

		variables = append(variables, metadata)
		variableCount++
	}

	variableData := model.DashboardbyId{
		Title:         title,
		UID:           uid,
		VariableList:  variables,
		VariableCount: variableCount,
	}

	responseData := model.Result{
		StatusCode:    "200",
		StatusMessage: "Success",
		Response:      variableData,
	}
	// Log the number of dashboards retrieved
	model.Log.Debug("Number of variables retrieved:", "info", len(variables))

	model.Log.Info("TenantId: " + usrObj.Tenant_Id + " About to return success response for getalldashboards")
	return response.JSON(http.StatusOK, responseData)
}

func getTemplatingArray(dash *model.DashboardById) ([]interface{}, error) {
	return dash.Data.Get("templating").Get("list").Array()
}

func getTitle(dash *model.DashboardById) (string, error) {
	return dash.Data.Get("title").String()
}

func getDataSource(itemMap map[string]interface{}) string {
	if datasource, ok := itemMap["datasource"].(map[string]interface{}); ok {
		// "datasource" key exists, now check for "type"
		if typeValue, ok := datasource["type"].(string); ok {
			return typeValue
		}
	}

	if datasource, ok := itemMap["datasource"].(string); ok {
		return datasource
	}
	return ""
}

func processTemplatingItem(item interface{}) model.Variable {

	itemMap := item.(map[string]interface{})
	metadata := model.Variable{}
	var dataSourceType string

	variableType, ok := itemMap["type"].(string)
	if !ok || variableType == "" {
		model.Log.Error("Missing or empty 'type' field", "error")
	} else {
		metadata.Type = variableType
	}

	includeAll, ok := itemMap["includeAll"].(bool)
	if !ok {
		model.Log.Error("Missing or invalid 'includeAll' field", "error")
	} else {
		metadata.IncludeAll = includeAll
	}

	multi, ok := itemMap["multi"].(bool)
	if !ok {
		model.Log.Error("Missing or invalid 'multi' field", "error")
	} else {
		metadata.Multi = multi
	}

	var sqlQuery, queryField, queryType, queryStr string
	switch variableType {
	case "query":
		dataSourceType = getDataSource(itemMap)
		metadata.Datasource = dataSourceType
		if dataSourceType == "bmchelix-ade-datasource" {
			queryField, ok = itemMap["query"].(string)
			if ok && queryField != "" {
				// Split the query string into parts
				parts := strings.SplitN(queryField, ",", 2)
				if len(parts) == 2 {
					queryType, queryStr = parts[0], parts[1]
					metadata.QueryType = queryType
					metadata.StatusCode = 200
					sqlQuery = queryStr
				} else {
					model.Log.Error("Invalid or unknown 'query' provided", "error")
					// queryType = "default"
					metadata.QueryType = ""
					metadata.StatusCode = 206
					sqlQuery = queryStr
				}
			} else {
				model.Log.Error("Empty 'query' provided", "error")
				// queryType = "default"
				metadata.QueryType = ""
				metadata.StatusCode = 206
			}

			// switch queryType {
			// case "remedy":
			// 	var queryContent map[string]string
			// 	queryStr = strings.ReplaceAll(queryStr, "\\", "")
			// 	if err := json.Unmarshal([]byte(queryStr), &queryContent); err != nil {
			// 		sqlQuery = queryField
			// 	}
			// 	sqlQuery = queryContent["sql"]
			// case "event":
			// 	sqlQuery = queryStr
			// case "metric":
			// 	sqlQuery = queryStr
			// case "optimize":
			// 	sqlQuery = queryStr

			// default:
			// 	model.Log.Error("Unknown query type", "error")
			// 	sqlQuery = queryField
			// 	metadata.StatusCode = 206
			// }
		} else if dataSourceType == "json-datasource" {
			// Code for handling BMC helix API json
			metadata.QueryType = "API-JSON"
			queryField, ok := itemMap["query"].(map[string]interface{})
			if !ok || queryField == nil {
				// Handle missing or empty 'query' field
				model.Log.Error("Missing or empty 'type' field", "error")
				sqlQuery = ""
				metadata.StatusCode = 206
			} else {
				//converting the map to JSON string
				jsonQuery, err := json.Marshal(queryField)
				if err != nil {
					model.Log.Error("Error converting map query to JSON", "error", err)
				} else {
					sqlQuery = string(jsonQuery)
					metadata.StatusCode = 200
				}
			}
		} else {
			model.Log.Error("Datasource is invalid, empty or not supported", "error")
		}
	default:
		// Code for the invalid case
		model.Log.Error("Variable type: ", variableType, "not supported", "error")
	}

	if name, ok := itemMap["name"].(string); ok {
		metadata.Name = name
	}

	if label, ok := itemMap["label"].(string); ok {
		metadata.Label = label
	}
	metadata.Query = sqlQuery

	return metadata
}
