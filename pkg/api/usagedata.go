package api

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/plugins"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
)

func (hs *HTTPServer) Usagedata(c *contextmodel.ReqContext) response.Response {

	predefinedQuery := c.Query("predefinedQuery")

	if predefinedQuery == "" {
		msg := "no value set for predefinedQuery parameter"
		hs.log.Error(msg)
		return hs.FailResponse(errors.New(msg))

	}

	if strings.EqualFold(predefinedQuery, "plugininfo") {

		res, err := hs.usagedataService.GetDashboardsUsingDeprecatedPlugins(c.Req.Context(), c.OrgID)
		if err != nil {
			return hs.FailResponse(err)
		}
		availablePlugins, err := hs.availablePlugins(c.Req.Context(), c.OrgID)
		if err == nil {
			panels := make(map[string]plugins.PanelDTO)
			for _, ap := range availablePlugins[plugins.TypePanel] {
				panel := ap.Plugin

				panels[panel.ID] = plugins.PanelDTO{
					ID:      panel.ID,
					Name:    panel.Name,
					Angular: panel.Angular,
				}
			}
			for i := range res.Data {
				if _, ok := panels[res.Data[i].PluginType]; ok {
					// For now, considering plugin deprecated
					// if it is dependent on Angular
					res.Data[i].Deprecated = panels[res.Data[i].PluginType].Angular.Detected
				}
			}
		}

		return hs.SuccessResponse(res)
	} else if strings.EqualFold(predefinedQuery, "usercount") {
		res, err := hs.usagedataService.GetUserData(c.Req.Context(), c.OrgID)
		if err != nil {
			return hs.FailResponse(err)
		}
		return hs.SuccessResponse(res)

	} else if strings.EqualFold(predefinedQuery, "orgdashboardsstats") {
		res, err := hs.usagedataService.GetOrgLevelDashboardStats(c.Req.Context(), c.OrgID)
		if err != nil {
			return hs.FailResponse(err)
		}
		return hs.SuccessResponse(res)

	} else if strings.EqualFold(predefinedQuery, "individualdashboardstats") {
		dashboardID, err := GetDashboardID(c.Query("dashboardID"))
		if err != nil {
			return hs.FailResponse(err)
		}

		res, err := hs.usagedataService.GetIndividualDashboardStats(c.Req.Context(), dashboardID, c.OrgID)
		if err != nil {
			return hs.FailResponse(err)
		}
		return hs.SuccessResponse(res)
	} else {

		// Convert fromTime and endTime from epoch seconds to date time format to seconds for the Unix() method
		from := c.Query("from")
		to := c.Query("to")

		const dbDateTimeFormat = "2006-01-02 15:04:05 -0700"

		// Not allowed to query for more than this number of days. This is also the default offset for fromTime if the param is missing
		const maxQueryableDays int64 = 30
		const maxQueryableDaysMilliSec int64 = maxQueryableDays * 24 * 60 * 60 * 1000

		// Grafana dashboard time variable is in milliseconds by default, so we are expecting that and converting to int before formatting to a postgres compatible format.
		var fromTimeInt, toTimeInt int64

		if to == "" {
			// default toTime when param is missing
			toTimeInt = time.Now().UnixMilli()
		} else {
			_temp, err := strconv.ParseInt(to, 10, 0)
			if err != nil {
				return hs.FailResponse(err)
			}
			toTimeInt = _temp
		}

		if from == "" {
			// default fromTime when param is missing
			fromTimeInt = toTimeInt - maxQueryableDaysMilliSec
		} else {
			_temp, err := strconv.ParseInt(from, 10, 0)
			if err != nil {
				return hs.FailResponse(err)
			}
			fromTimeInt = _temp
		}

		if (toTimeInt - fromTimeInt) > maxQueryableDaysMilliSec {
			hs.log.Warn(fmt.Sprintf("Changed fromTime to (toTime - %d days) since it was going beyond the allowed timeframe", maxQueryableDays))
			fromTimeInt = toTimeInt - maxQueryableDaysMilliSec
		}

		formattedFromTime := time.UnixMilli(fromTimeInt).Format(dbDateTimeFormat)
		formattedToTime := time.UnixMilli(toTimeInt).Format(dbDateTimeFormat)

		if strings.EqualFold(predefinedQuery, "schedule") {

			res, err := hs.usagedataService.GetDashboardsReportScheduler(c.Req.Context(), formattedFromTime, formattedToTime, c.OrgID)
			if err != nil {
				return hs.FailResponse(err)
			}

			return hs.SuccessResponse(res)
		} else if strings.EqualFold(predefinedQuery, "dashboardhitcount") {
			dashboardID, err := GetDashboardID(c.Query("dashboardID"))
			if err != nil {
				return hs.FailResponse(err)
			}
			res, err := hs.usagedataService.GetDashboardHits(c.Req.Context(), formattedFromTime, formattedToTime, dashboardID, c.OrgID)
			if err != nil {
				return hs.FailResponse(err)
			}

			return hs.SuccessResponse(res)
		} else if strings.EqualFold(predefinedQuery, "dashboardloadtime") {
			dashboardID, err := GetDashboardID(c.Query("dashboardID"))
			if err != nil {
				return hs.FailResponse(err)
			}
			res, err := hs.usagedataService.GetDashboardLoadTimes(c.Req.Context(), formattedFromTime, formattedToTime, dashboardID, c.OrgID)
			if err != nil {
				return hs.FailResponse(err)
			}

			return hs.SuccessResponse(res)
		}
	}

	// Value not supported
	msg := predefinedQuery + " is not a valid value for the parameter predefinedQuery"
	hs.log.Error(msg)
	return hs.FailResponse(errors.New(msg))

}

func GetDashboardID(dashboardIDString string) (int64, error) {
	if dashboardIDString == "" {
		return 0, errors.New("Dashboard ID must be provided to fetch individual dashboard stats")
	}
	_temp, err := strconv.ParseInt(dashboardIDString, 10, 0)
	if err != nil {
		return 0, err
	}
	return _temp, nil
}
