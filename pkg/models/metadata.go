package models

import (
	"errors"

	"github.com/grafana/grafana/pkg/components/simplejson"
)

// Typed errors
var (
	ErrDSNotFound        = errors.New("datasource details not found")
	ErrViewNotFound      = errors.New("view not found")
	ErrViewDetailsFailed = errors.New("failed to fetch view details")
	ErrGenerateSqlFailed = errors.New("unable to generate sql")
)

type View struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	// TenantID        int64  `json:"tenantId"`
	// UserID          int64  `json:"userId"`
	// FileKey         string `json:"fileKey"`
	ItsmCompVersion string `json:"itsmCompVersion"`

	// Created time.Time
	// Updated time.Time
}

type ViewDetail struct {
	ID         string         `json:"id"`
	Categories []ViewCategory `json:"categories"`
}

type ViewCategory struct {
	ID             string               `json:"id"`
	Logicalcolumns []ViewLogicalColumns `json:"logicalcolumns"`
}

type ViewLogicalColumns struct {
	ColumnID   string                  `json:"columnId"`
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
	ViewID     string           `json:"viewId"`
	Selections *simplejson.Json `json:"selections"`
	Filters    *simplejson.Json `json:"filters"`
}

type GeneratedSQL struct {
	Query        string           `json:"query"`
	Map          *simplejson.Json `json:"name"`
	DisplayQuery string           `json:"displayQuery"`
	ParamList    interface{}      `json:"paramList"`
}
