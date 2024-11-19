package api

import (
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/datasources"
	"github.com/grafana/grafana/pkg/services/msp"
	"github.com/grafana/grafana/pkg/services/team"
)

func (hs *HTTPServer) buildMSPDSQuery(c *contextmodel.ReqContext) datasources.GetDataSourcesQuery {
	query := datasources.GetDataSourcesQuery{OrgID: c.SignedInUser.GetOrgID(), DataSourceLimit: hs.Cfg.DataSourceLimit}
	//ITOM MSP Tenant
	//Fetch org name from DB using c.SignedInUser.MspOrgs
	if len(c.SignedInUser.MspOrgs) > 0 {
		mspOrgsIdsList := make([]int64, 0)
		dataSourceNames := make([]string, 0)
		for _, mspOrgId := range c.SignedInUser.MspOrgs {
			if mspOrgId != "0" {
				mspTeamID := msp.CreateTeamIDWithOrgString(c.SignedInUser.OrgID, mspOrgId)
				mspOrgsIdsList = append(mspOrgsIdsList, int64(mspTeamID))
			} else {
				dataSourceNames = append(dataSourceNames, "BMC Helix")
			}
		}
		teams := make([]*team.TeamDTO, 0)
		teams, err := hs.teamService.GetTeamsByIds(c.Req.Context(), c.SignedInUser.OrgID, mspOrgsIdsList)
		if err != nil {
			c.Logger.Error("Failed to fetch msp teams")
		} else {
			for _, team := range teams {
				if team.IsMspTeam && team.Type == 2 {
					dataSourceNames = append(dataSourceNames, team.Name)
				}
			}
			if len(dataSourceNames) == 0 {
				dataSourceNames = append(dataSourceNames, "BMC Helix")
			}

			if len(dataSourceNames) > 0 {
				query.Names = dataSourceNames
				query.ITOMMSPSubTenant = true
				query.Type = "bmchelix-ade-datasource"
			}
			c.Logger.Debug("In getFSDataSources", "Teams size", len(teams), "datasource names", dataSourceNames)
		}
	}
	return query
}
