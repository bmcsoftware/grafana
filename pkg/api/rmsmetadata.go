package api

import (
	"encoding/json"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"

	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/web"
)

const DefaultRMSURLString = "http://adereporting-rms:8080"

var RMSURLString string

func GetRMSURL() *url.URL {
	RMSURLString = os.Getenv("ADEREPORTING-RMS-ENDPOINT")
	if RMSURLString == "" {
		RMSURLString = DefaultRMSURLString
	}
	rmsBaseURL, _ := url.Parse(RMSURLString)
	return rmsBaseURL
}

var reverseProxy = httputil.NewSingleHostReverseProxy(GetRMSURL())

func (hs *HTTPServer) GetViewList(c *contextmodel.ReqContext) response.Response {
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
			TenantID:        view.TenantID,
			Deleted:         view.Deleted,
		})
	}
	return hs.SuccessResponse(&result)
}

func (hs *HTTPServer) GetViewDetails(c *contextmodel.ReqContext) response.Response {
	viewId, err := strconv.ParseInt(web.Params(c.Req)[":viewID"], 10, 64)
	if err != nil {
		return hs.FailResponse(models.ErrViewNotFound)
	}

	rmsURL := RMSURLString

	res, err := hs.rmsMetadataService.GetViewById(c.Req.Context(), c.OrgID, viewId)
	if res == nil || res.FileKey == "" || res.Deleted {
		return hs.FailResponse(models.ErrViewNotFound)
	}
	if err != nil {
		hs.log.Error("Failed to get view from view list", err)
		return hs.FailResponse(models.ErrViewDetailsFailed)
	}
	imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
	if err != nil {
		return hs.FailResponse(err)
	}

	headers := map[string]string{
		"Authorization": "Bearer " + imsToken,
		"Tenant-Id":     strconv.Itoa(int(c.OrgID)),
	}
	path := rmsURL + "/" + "reportingmetadata/api/v1/BIView"
	queryParams := map[string]string{
		"fileKey":  res.FileKey,
		"viewName": res.Name,
	}

	resp, err := hs.rmsMetadataService.Get(path, headers, queryParams)
	if err != nil {
		if resp != nil {
			var errResp models.RMSErr
			err = json.Unmarshal(resp, &errResp)
			if err == nil {
				return response.JSON(500, CustomResponse{Message: errResp.ErrorCode + " : " + errResp.ErrorMessage})
			}
		}
		hs.log.Error("Failed to get view details from RMS", err)
		return hs.FailResponse(models.ErrViewDetailsFailed)
	}
	var finalResponse models.ViewDetailResp
	err = json.Unmarshal(resp, &finalResponse)
	if err != nil {
		hs.log.Error("Failed to parse rms response in view details", err)
		return hs.FailResponse(models.ErrViewDetailsFailed)
	}
	finalResponse.LogicalModel.ID = res.FileKey
	return hs.SuccessResponse(finalResponse.LogicalModel)
}

func (hs *HTTPServer) GetGeneratedQuery(c *contextmodel.ReqContext) response.Response {
	cmd := &models.GenerateQueryCmd{}

	if err := web.Bind(c.Req, cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request payload", err)
	}

	rmsURL := RMSURLString

	imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
	if err != nil {
		return hs.FailResponse(err)
	}

	headers := map[string]string{
		"Authorization": "Bearer " + imsToken,
		"Tenant-Id":     strconv.Itoa(int(c.OrgID)),
	}
	path := rmsURL + "/" + "reportingmetadata/api/v1/generate_sql"
	queryParams := map[string]string{}

	b, err := json.Marshal(cmd)
	if err != nil {
		hs.log.Error("Failed to marshal input json", err)
		return hs.FailResponse(models.ErrGenerateSqlFailed)
	}

	resp, err := hs.rmsMetadataService.Post(path, headers, queryParams, b)
	if err != nil {
		if resp != nil {
			var errResp models.RMSErr
			err = json.Unmarshal(resp, &errResp)
			if err == nil {
				return response.JSON(500, CustomResponse{Message: errResp.ErrorCode + " : " + errResp.ErrorMessage})
			}
		}
		hs.log.Error("Failed to generate sql from RMS", err)
		return hs.FailResponse(models.ErrGenerateSqlFailed)
	}

	var finalResponse models.GeneratedSQL
	err = json.Unmarshal(resp, &finalResponse)
	if err != nil {
		hs.log.Error("Failed to parse rms response for generate sql command", err)
		return hs.FailResponse(models.ErrGenerateSqlFailed)
	}

	return hs.SuccessResponse(finalResponse)
}

func (hs *HTTPServer) downloadStudio(c *contextmodel.ReqContext) {
	rmsURL := GetRMSURL()

	imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
	if err != nil {
		c.Handle(hs.Cfg, 400, err.Error(), err)
		return
	}

	reverseProxy.Director = func(req *http.Request) {
		req.URL.Host = rmsURL.Host
		req.URL.Scheme = rmsURL.Scheme
		req.URL.Path = "/reportingmetadata/api/v1/studio/download"
		req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
		req.Header.Set("Authorization", "Bearer "+imsToken)
		req.Header.Set("Tenant-Id", strconv.Itoa(int(c.OrgID)))
		req.Host = rmsURL.Host
	}

	reverseProxy.ServeHTTP(c.Resp, c.Req)
}
