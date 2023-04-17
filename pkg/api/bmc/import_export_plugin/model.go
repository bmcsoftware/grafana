package import_export_plugin

import "github.com/grafana/grafana/pkg/models"

type GetDashQuery struct {
	FolderUIds    []string
	DashboardUIds []string
	Result        []*models.Dashboard
}

type Datasource struct {
	Name     string `xorm:"name"`
	UID      string `xorm:"uid"`
	PluginID string `xorm:"type"`
}

type GetDSQuery struct {
	UID    []string
	Result []*Datasource
}
