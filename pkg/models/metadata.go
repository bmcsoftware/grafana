package models

import (
	"errors"

	"github.com/grafana/grafana/pkg/components/simplejson"
)

// Typed errors
var (
	ErrDSNotFound        = errors.New("Datasource details not found")
	ErrViewNotFound      = errors.New("View not found")
	ErrViewDetailsFailed = errors.New("Failed to fetch view details")
	ErrGenerateSqlFailed = errors.New("Unable to generate sql")
)

type View struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	TenantID int64  `json:"tenantId"`
	// UserID          int64  `json:"userId"`
	// FileKey         string `json:"fileKey"`
	ItsmCompVersion string `json:"itsmCompVersion"`
	Deleted         bool   `json:"deleted"`
	// Created time.Time
	// Updated time.Time
}

type ViewDetailResp struct {
	LogicalModel ViewDetail `json:"logicalModel"`
}

type ViewDetail struct {
	ID         string         `json:"id"`
	Categories []ViewCategory `json:"categories"`
}

type ViewCategory struct {
	ID             string               `json:"id"`
	Name           string               `json:"name"`
	Logicalcolumns []ViewLogicalColumns `json:"logicalcolumns"`
}

type ViewLogicalColumns struct {
	ColumnID   string                  `json:"columnId"`
	ColumnName string                  `json:"columnName"`
	Properties LogicalColumnProperties `json:"properties"`
}

type LogicalColumnProperties struct {
	Hidden           bool             `json:"hidden"`
	TargetColumnType string           `json:"target_column_type"`
	Aggregation      string           `json:"aggregation"`
	Fieldtype        string           `json:"fieldtype"`
	TargetColumn     string           `json:"target_column"`
	Datatype         string           `json:"datatype"`
	Name             *simplejson.Json `json:"name"`
	AggregationList  []interface{}    `json:"aggregation_list"`
	Alignment        string           `json:"alignment"`
}

type GenerateQueryCmd struct {
	Distinct   bool             `json:"distinct"`
	ViewID     string           `json:"viewId"`
	Selections *simplejson.Json `json:"selections"`
	Filters    *simplejson.Json `json:"filters"`
}

type GeneratedSQL struct {
	SqlQuery string `json:"sqlQuery"`
}

type RMSErr struct {
	ErrorMessage string `json:"errorMessage"`
	ErrorCode    string `json:"errorCode"`
}
