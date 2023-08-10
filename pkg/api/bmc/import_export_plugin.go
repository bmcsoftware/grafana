// BMC Code

package bmc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/grafana/grafana/pkg/infra/slugify"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/libraryelements/model"

	"github.com/google/uuid"
	plugin "github.com/grafana/grafana/pkg/api/bmc/import_export_plugin"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

func (p *PluginsAPI) ImportPlugin(c *contextmodel.ReqContext) response.Response {
	return response.Success("Not implemented yet")
}

func (p *PluginsAPI) ExportPlugin(c *contextmodel.ReqContext) response.Response {
	cmd := plugin.ExportDTO{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	if len(cmd.DashUIds) == 0 && len(cmd.FolderUIds) == 0 {
		return response.Error(http.StatusBadRequest, "bad request data", nil)
	}

	// Get list of dashboards
	query := &plugin.GetDashQuery{DashboardUIds: cmd.DashUIds, FolderUIds: cmd.FolderUIds}
	if err := p.GetDashboards(c.Req.Context(), c.OrgID, query); err != nil {
		return response.Error(500, "Failed to get dashboards", err)
	}
	dashboards := query.Result

	dsQuery := &plugin.GetDSQuery{}
	if err := p.GetDatasources(c.Req.Context(), c.OrgID, dsQuery); err != nil {
		return response.Error(500, "Failed to get dashboards", err)
	}
	datasources := prepareInputs(dsQuery.Result)

	for _, dash := range dashboards {
		// Prepare library panels for each dashboard.__elements
		var libList map[string]model.LibraryElementDTO
		var err error
		if libList, err = p.prepareLibraryPanels(c.Req.Context(), dash); err != nil {
			plugin.Log.Error("Failed to prepare library panels", err)
		}

		// Prepare datasources list for each dashboard.__inputs
		dsNames := p.prepareDatasource(c.Req.Context(), dash, datasources, libList)
		varList := p.prepareVariables(c.Req.Context(), dash, datasources, dsNames)
		dsList := p.convertDSNamestoDSList(dsNames, datasources)
		__inputs := append(dsList, varList...)

		if libList != nil {
			dash.Data.Set("__elements", libList)
		}

		dash.Data.Set("__inputs", __inputs)
	}

	newUuid := uuid.New().String()
	folderDest := filepath.Join(os.TempDir(), newUuid, "export")
	err := p.prepareJsonFiles(dashboards, folderDest)
	if err != nil {
		return response.Error(500, err.Msg, err.Err)
	}
	plugin.Log.Debug("Exported dashboards to folder", "folder", folderDest)

	zipData, err := p.prepareZipFile(newUuid, folderDest)
	if err != nil {
		return response.Error(500, err.Msg, err.Err)
	}

	headers := http.Header{}
	headers.Set("Content-Type", "application/zip")
	headers.Set("Content-Disposition", "attachment; filename=dashboards_export.zip")
	return response.CreateNormalResponse(headers, zipData, 200)
}

func (p *PluginsAPI) GetDashboards(ctx context.Context, orgId int64, query *plugin.GetDashQuery) error {
	return p.store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		if len(query.DashboardUIds) == 0 && len(query.FolderUIds) == 0 {
			return errors.New("no dashboards or folders provided")
		}

		// Get folders by uids
		folders := make([]*dashboards.Dashboard, 0)
		if err := sess.
			In("uid", query.FolderUIds).
			Where("is_folder = ?", true).
			Where("org_id=?", orgId).
			Limit(setting.BulkLimit).
			Find(&folders); err != nil {
			return err
		}
		folderIds := make([]int64, 0)
		for _, folder := range folders {
			folderIds = append(folderIds, folder.ID)
		}

		// if General folder is present, then add folder id 0 to list
		generalSelected := util.Contains(query.FolderUIds, "general")
		if generalSelected {
			folderIds = append(folderIds, 0)
		}

		// Pull dashboards by dashboard uids
		dashboards1 := make([]*dashboards.Dashboard, 0)
		if err := sess.
			In("uid", query.DashboardUIds).
			Where("is_folder = ?", false).
			Where("org_id=?", orgId).
			Find(&dashboards1); err != nil {
			return err
		}

		// Pull dashboards by folder ids
		dashboards2 := make([]*dashboards.Dashboard, 0)
		if err := sess.
			In("folder_id", folderIds).
			Where("is_folder = ?", false).
			Where("org_id=?", orgId).
			Find(&dashboards2); err != nil {
			return err
		}

		query.Result = append(dashboards1, dashboards2...)
		return nil
	})
}

func (p *PluginsAPI) GetDatasources(ctx context.Context, orgId int64, query *plugin.GetDSQuery) error {
	return p.store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		datasource := make([]*plugin.Datasource, 0)
		if err := sess.
			Table("data_source").
			Where("org_id=?", orgId).
			Find(&datasource); err != nil {
			return err
		}
		query.Result = datasource
		return nil
	})
}

func (p *PluginsAPI) prepareLibraryPanels(c context.Context, dash *dashboards.Dashboard) (map[string]model.LibraryElementDTO, error) {
	libraryPanels, err := p.panelSvc.GetElementsForDashboard(c, dash.ID)
	if err != nil {
		plugin.Log.Error("Failed to prepare library panels", "error", err)
		return nil, err
	}
	dashPanels := dash.Data.Get("panels").MustArray()
	for _, dashPanel := range dashPanels {
		panelAsJSON := simplejson.NewFromAny(dashPanel)
		libraryPanel := panelAsJSON.Get("libraryPanel")

		UID := libraryPanel.Get("uid").MustString()

		if UID != "" {
			for _, libPanel := range libraryPanels {
				if libPanel.UID == UID {
					libraryPanel.Set("name", libPanel.Name)
				}
			}
		}

	}
	dash.Data.Set("panels", dashPanels)
	return libraryPanels, nil
}

func (p *PluginsAPI) prepareDatasource(c context.Context, dashboard *dashboards.Dashboard, inputs map[string]*simplejson.Json, libList map[string]model.LibraryElementDTO) []string {
	dsList := make([]string, 0)
	panelsJson := dashboard.Data.Get("panels").MustArray()
	updatedPanels := make([]*simplejson.Json, 0)

	for _, panelJson := range panelsJson {
		panel := simplejson.NewFromAny(panelJson)
		_, checkGet := panel.CheckGet("datasource")
		if checkGet {
			//Fix for Mixed dashboard export where it is throwing nil reference exception
			dsUid := panel.GetPath("datasource", "uid").MustString("")
			dsType := panel.GetPath("datasource", "uid").MustString("")
			if dsUid != "" && dsType != "-- Mixed --" {
				dsList = append(dsList, dsUid)
				updatedUid := inputs[dsUid].Get("name").MustString("")

				if updatedUid != "" {
					panel.SetPath([]string{"datasource", "uid"}, fmt.Sprintf("${%s}", updatedUid))
				}
			}

			// Get datasources from panel.targets
			targets := panel.Get("targets").MustArray([]interface{}{})
			updatedTargets := make([]*simplejson.Json, 0)
			for _, target := range targets {
				targetJson := simplejson.NewFromAny(target)
				if targetJson != nil {
					dsUid := targetJson.GetPath("datasource", "uid").MustString("")
					if dsUid != "" && dsType != "-- Mixed --" {
						dsList = append(dsList, dsUid)

						updatedUid := inputs[dsUid].Get("name").MustString("")
						if updatedUid != "" {
							targetJson.SetPath([]string{"datasource", "uid"}, fmt.Sprintf("${%s}", updatedUid))
						}

					}
				}
				updatedTargets = append(updatedTargets, targetJson)
			}
			panel.Set("targets", updatedTargets)
			updatedPanels = append(updatedPanels, panel)
		}
	}
	dashboard.Data.Set("panels", updatedPanels)
	if libList != nil {
		for k, v := range libList {
			plugin.Log.Info("Itering library panel for :", k)
			var jsonModel *simplejson.Json
			json.Unmarshal(v.Model, &jsonModel)
			dsUid := jsonModel.GetPath("datasource", "uid").MustString("")
			if dsUid != "" {
				dsList = append(dsList, dsUid)
				updatedUid := inputs[dsUid].Get("name").MustString("")
				if updatedUid != "" {
					jsonModel.SetPath([]string{"datasource", "uid"}, fmt.Sprintf("${%s}", updatedUid))
				}
			}
			// Get datasources from panel.targets
			targets := jsonModel.Get("targets").MustArray([]interface{}{})
			updatedTargets := make([]*simplejson.Json, 0)
			for _, target := range targets {
				targetJson := simplejson.NewFromAny(target)
				if targetJson != nil {
					dsUid := targetJson.GetPath("datasource", "uid").MustString("")
					if dsUid != "" {
						dsList = append(dsList, dsUid)
						updatedUid := inputs[dsUid].Get("name").MustString("")
						if updatedUid != "" {
							targetJson.SetPath([]string{"datasource", "uid"}, fmt.Sprintf("${%s}", updatedUid))
						}
					}
				}
				updatedTargets = append(updatedTargets, targetJson)
			}
			jsonModel.Set("targets", updatedTargets)
			if updatedVal, err := json.Marshal(jsonModel); err != nil {
				plugin.Log.Error("Failed to marshal library panels json", err)
			} else {
				v.Model = updatedVal
			}
			libList[k] = v
		}
	}

	return dsList
}

func (p *PluginsAPI) convertDSNamestoDSList(dsNames []string, inputs map[string]*simplejson.Json) []*simplejson.Json {
	// remove duplicates
	dsNames = util.RemoveDuplicates(dsNames)
	dashboardDatasources := make([]*simplejson.Json, 0)
	for _, dsUID := range dsNames {
		if ds, ok := inputs[dsUID]; ok {
			dashboardDatasources = append(dashboardDatasources, ds)
		}
	}
	return dashboardDatasources
}

func (p *PluginsAPI) prepareVariables(c context.Context, dashboard *dashboards.Dashboard, inputs map[string]*simplejson.Json, dsNames []string) []*simplejson.Json {
	variablesList := make([]*simplejson.Json, 0)
	variablesJson := dashboard.Data.GetPath("templating", "list").MustArray()
	updatedVars := make([]*simplejson.Json, 0)
	for _, variableJson := range variablesJson {
		variable := simplejson.NewFromAny(variableJson)
		if variable == nil {
			continue
		}
		variableType := variable.Get("type").MustString("")
		if variableType == "constant" {
			variablesList = append(variablesList, variable)
		}
		if variableType == "query" {
			dsUid := variable.GetPath("datasource", "uid").MustString("")
			if dsUid != "" {
				dsNames = append(dsNames, dsUid)
				updatedUid := inputs[dsUid].Get("name").MustString("")
				if updatedUid != "" {
					variable.SetPath([]string{"datasource", "uid"}, fmt.Sprintf("${%s}", updatedUid))
				}
			}
		}
		updatedVars = append(updatedVars, variable)
	}
	dashboard.Data.SetPath([]string{"templating", "list"}, updatedVars)
	result := prepareVariableInputs(variablesList)
	return result
}

func (p *PluginsAPI) prepareJsonFiles(dashboards []*dashboards.Dashboard, folderDest string) *plugin.ErrorResult {
	err := os.MkdirAll(folderDest, os.ModeDir|os.ModePerm)
	if err != nil {
		return plugin.NewErrorResult("Failed to create folder", err)
	}
	for _, dashboard := range dashboards {
		data, err := dashboard.Data.Encode()
		if err != nil {
			plugin.Log.Error("Failed to marshal dashboard", "error", err)
			continue
		}
		fileName := slugify.Slugify(dashboard.Title)
		filePath := filepath.Join(folderDest, fmt.Sprintf("%s_%s.json", fileName, dashboard.UID))
		plugin.Log.Debug("Exporting dashboard", "title", dashboard.Title, "file", filePath)
		file, err := os.Create(filePath)
		if err != nil {
			plugin.Log.Error("Failed to write file", "error", err)
			continue
		}
		if _, err = file.Write(data); err != nil {
			plugin.Log.Error("Failed to write file", "error", err)
		}
		file.Sync()
		file.Close()
	}
	return nil
}

func (p *PluginsAPI) prepareZipFile(newUuid, folderDest string) ([]byte, *plugin.ErrorResult) {
	zipFilePath := filepath.Join(os.TempDir(), newUuid, "dashboards_export.zip")
	if err := createZip(zipFilePath, folderDest); err != nil {
		return nil, err
	}
	zipData, errRead := os.ReadFile(zipFilePath)
	if errRead != nil {
		return nil, plugin.NewErrorResult("Failed to read archive", errRead)
	}
	return zipData, nil
}
