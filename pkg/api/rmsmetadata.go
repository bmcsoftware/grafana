package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/datasources"
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

	rmsURL, err := hs.GetRMSURL(c)
	if err != nil {
		hs.log.Error("Failed to get datasource details", err)
		return hs.FailResponse(models.ErrDSNotFound)
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
	path := rmsURL + "/" + "api/v1/rms/BIView"
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

func (hs *HTTPServer) GetGeneratedQuery(c *models.ReqContext) response.Response {
	cmd := &models.GenerateQueryCmd{}

	if err := web.Bind(c.Req, cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request payload", err)
	}

	rmsURL, err := hs.GetRMSURL(c)
	if err != nil {
		hs.log.Error("Failed to get datasource details", err)
		return hs.FailResponse(models.ErrDSNotFound)
	}

	imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
	if err != nil {
		return hs.FailResponse(err)
	}

	headers := map[string]string{
		"IMS-JWT":   imsToken,
		"Tenant-Id": strconv.Itoa(int(c.OrgID)),
	}
	path := rmsURL + "/" + "api/v1/rms/generate_sql"
	queryParams := map[string]string{}

	b, err := json.Marshal(cmd)
	if err != nil {
		hs.log.Error("Failed to marshal input json", err)
		return hs.FailResponse(models.ErrGenerateSqlFailed)
	}
	resp, err := hs.rmsMetadataService.Post(path, headers, queryParams, b)
	if err != nil {
		hs.log.Error("Failed to generate sql from RMS", err)
		return hs.FailResponse(models.ErrGenerateSqlFailed)
	}

	// ToDo: Temporary changes, to be removed after and uncomment below code

	finalResponse := models.GeneratedSQL{Query: string(resp)}
	// var finalResponse models.GeneratedSQL
	// err = json.Unmarshal(resp, &finalResponse)
	// if err != nil {
	// 	hs.log.Error("Failed to parse rms response for generate sql command", err)
	// 	return hs.FailResponse(models.ErrGenerateSqlFailed)
	// }

	return hs.SuccessResponse(finalResponse)
}

func (hs *HTTPServer) GetRMSURL(c *models.ReqContext) (string, error) {
	params := c.Req.URL.Query()
	dUId := params.Get("dUId")

	ds, err := hs.getRawDataSourceByUID(c.Req.Context(), dUId, c.OrgID)

	if err != nil {
		if errors.Is(err, datasources.ErrDataSourceNotFound) {
			return "", err
		}
		return "", errors.New("FAILED_QUERY_DATASOURCE")
	}

	dto := hs.convertModelToDtos(c.Req.Context(), ds)
	return dto.JsonData.Get("rmsMetadataURL").MustString(), nil
}
