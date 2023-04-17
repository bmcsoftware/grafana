package api

import (
	"encoding/json"
	"strconv"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/web"
)

func (hs *HTTPServer) GetViewList(c *models.ReqContext) response.Response {
	result := make([]*models.View, 0)
	res, err := hs.rmsMetadataService.GetViewList(c.Req.Context(), c.OrgID)
	if err != nil {
		return hs.FailResponse(err)
	}
	for _, view := range res {
		result = append(result, &models.View{
			ID:              view.ID,
			Name:            view.Name,
			ItsmCompVersion: view.ItsmCompVersion,
		})
	}
	return hs.SuccessResponse(&result)
}

func (hs *HTTPServer) GetViewDetails(c *models.ReqContext) response.Response {
	viewId, err := strconv.ParseInt(web.Params(c.Req)[":viewID"], 10, 64)

	if err != nil {
		return hs.FailResponse(models.ErrViewNotFound)
	}
	res, err := hs.rmsMetadataService.GetViewById(c.Req.Context(), c.OrgID, viewId)
	if res == nil {
		return hs.FailResponse(models.ErrViewNotFound)
	}
	if err != nil {
		hs.log.Error("Failed to get view from local grafana", err)
		return hs.FailResponse(models.ErrViewDetailsFailed)
	}
	imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
	if err != nil {
		return hs.FailResponse(err)
	}

	headers := map[string]string{
		"IMS-JWT":   imsToken,
		"Tenant-Id": strconv.Itoa(int(c.OrgID)),
	}
	path := "api/v1/rms/BIView"
	queryParams := map[string]string{
		"fileKey":  res.FileKey,
		"viewName": res.Name,
	}
	resp, err := hs.rmsMetadataService.Get(path, headers, queryParams)
	if err != nil {
		hs.log.Error("Failed to get view details from RMS", err)
		return hs.FailResponse(models.ErrViewDetailsFailed)
	}
	var finalResponse models.ViewDetail
	err = json.Unmarshal(resp, &finalResponse)
	if err != nil {
		hs.log.Error("Failed to parse rms response in view details", err)
		return hs.FailResponse(models.ErrViewDetailsFailed)
	}

	return hs.SuccessResponse(finalResponse)
}
