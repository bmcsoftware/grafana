package api

// @description BMC Custom code
// @author kmejdi

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/grafana/grafana/pkg/infra/log"

	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/rendering"
	"github.com/grafana/grafana/pkg/util"
	macaron "gopkg.in/macaron.v1"
)

func (hs *HTTPServer) CustomRenderToPng(c *models.ReqContext) {
	queryReader, err := util.NewURLQueryReader(c.Req.URL)
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", err)
		return
	}

	queryParams := fmt.Sprintf("?%s", c.Req.URL.RawQuery)

	width, err := strconv.Atoi(queryReader.Get("width", "800"))
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", fmt.Errorf("cannot parse width as int: %s", err))
		return
	}

	height, err := strconv.Atoi(queryReader.Get("height", "400"))
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", fmt.Errorf("cannot parse height as int: %s", err))
		return
	}

	timeout, err := strconv.Atoi(queryReader.Get("timeout", "60"))
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", fmt.Errorf("cannot parse timeout as int: %s", err))
		return
	}

	scale, err := strconv.ParseFloat(queryReader.Get("scale", "1"), 64)
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", fmt.Errorf("cannot parse scale as float: %s", err))
		return
	}

	headers := http.Header{}
	acceptLanguageHeader := c.Req.Header.Values("Accept-Language")
	if len(acceptLanguageHeader) > 0 {
		headers["Accept-Language"] = acceptLanguageHeader
	}

	isARQuery, err := strconv.ParseBool(queryReader.Get("isARQuery", "false"))
	if err != nil {
		log.Infof("Render parameters error %v", fmt.Errorf("cannot parse isAR as bool: %s", err))
	}
	// Capture the IMS_JWT_Token from Cookie if the call is from end users, if not
	// then try capturing the IMS-JWT-Token from request header if it exists them
	// make it the one to use, and forward it to Renderer as Authorization headers
	// Query call can come from AR-Sys APIs so the Authorization header value will
	// change from using Bearer to IMS-JWT, e.g. :
	// Authorization: Bearer <IMS-JWT-Token> or IMS-JWT <IMS-JWT-Token>
	imsJWTToken := c.Req.Header.Get("X-Jwt-Token")
	imsJWTTokenHeader := c.Req.Header.Get("IMS-JWT-Token")
	if imsJWTTokenHeader != "" {
		imsJWTToken = imsJWTTokenHeader
	}
	if imsJWTToken == "" {
	} else {
		if isARQuery {
			imsJWTToken = "IMS-JWT " + imsJWTToken
		} else {
			imsJWTToken = "Bearer " + imsJWTToken
		}
		headers.Set("IMS-JWT-Token", imsJWTToken)
	}

	result, err := hs.RenderService.Render(c.Req.Context(), rendering.Opts{
		Width:             width,
		Height:            height,
		Timeout:           time.Duration(timeout) * time.Second,
		OrgID:             c.OrgId,
		UserID:            c.UserId,
		OrgRole:           c.OrgRole,
		Path:              macaron.Params(c.Req)["*"] + queryParams,
		Timezone:          queryReader.Get("tz", ""),
		Encoding:          queryReader.Get("encoding", ""),
		ConcurrentLimit:   hs.Cfg.RendererConcurrentRequestLimit,
		DeviceScaleFactor: scale,
		Headers:           headers,
	})
	if err != nil {
		if errors.Is(err, rendering.ErrTimeout) {
			c.Handle(hs.Cfg, 500, err.Error(), err)
			return
		}

		c.Handle(hs.Cfg, 500, "Rendering failed.", err)
		return
	}

	c.Resp.Header().Set("Content-Type", "image/png")
	http.ServeFile(c.Resp, c.Req, result.FilePath)
}

func (hs *HTTPServer) CustomRenderToPdf(c *models.ReqContext) {
	queryReader, err := util.NewURLQueryReader(c.Req.URL)
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", err)
		return
	}

	timeout, err := strconv.Atoi(queryReader.Get("timeout", "60"))
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", fmt.Errorf("cannot parse timeout as int: %s", err))
		return
	}

	scale, err := strconv.ParseFloat(queryReader.Get("scale", "1"), 64)
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", fmt.Errorf("cannot parse scale as float: %s", err))
		return
	}

	headers := http.Header{}
	acceptLanguageHeader := c.Req.Header.Values("Accept-Language")
	if len(acceptLanguageHeader) > 0 {
		headers["Accept-Language"] = acceptLanguageHeader
	}

	imsJWTToken := c.Req.Header.Get("X-Jwt-Token")
	imsJWTTokenHeader := c.Req.Header.Get("IMS-JWT-Token")
	if imsJWTTokenHeader != "" {
		imsJWTToken = imsJWTTokenHeader
	}
	if imsJWTToken != "" {
		headers.Set("IMS-JWT-Token", imsJWTToken)
	}

	result, err := hs.RenderService.CustomRenderPDF(c.Req.Context(), rendering.CustomPDFOpts{
		Timeout:           time.Duration(timeout) * time.Second,
		OrgId:             c.OrgId,
		UserId:            c.UserId,
		OrgRole:           c.OrgRole,
		Encoding:          queryReader.Get("encoding", ""),
		Timezone:          queryReader.Get("tz", ""),
		ConcurrentLimit:   hs.Cfg.RendererConcurrentRequestLimit,
		DeviceScaleFactor: scale,
		Headers:           headers,
		UID:               queryReader.Get("uid", ""),
		ReportName:        queryReader.Get("name", ""),
		Description:       queryReader.Get("description", ""),
		From:              queryReader.Get("from", ""),
		To:                queryReader.Get("to", ""),
		CompanyLogo:       queryReader.Get("companyLogo", ""),
		FooterText:        queryReader.Get("footerText", ""),
		FooterURL:         queryReader.Get("footerURL", ""),
		Theme:             queryReader.Get("theme", "light"),
		Layout:            queryReader.Get("layout", "simple"),
		Orientation:       queryReader.Get("orientation", "portrait"),
		Variables:         queryReader.Get("variables", ""),
	})

	if err != nil {
		if errors.Is(err, rendering.ErrTimeout) {
			c.Handle(hs.Cfg, 500, err.Error(), err)
			return
		}
		c.Handle(hs.Cfg, 500, "Rendering failed.", err)
		return
	}

	c.Resp.Header().Set("Content-Type", "application/pdf")
	http.ServeFile(c.Resp, c.Req, result.FilePath)
}

func (hs *HTTPServer) CustomRenderToCsv(c *models.ReqContext) {
	queryReader, err := util.NewURLQueryReader(c.Req.URL)
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", err)
		return
	}

	timeout, err := strconv.Atoi(queryReader.Get("timeout", "60"))
	if err != nil {
		c.Handle(hs.Cfg, 400, "Render parameters error", fmt.Errorf("cannot parse timeout as int: %s", err))
		return
	}

	headers := http.Header{}
	acceptLanguageHeader := c.Req.Header.Values("Accept-Language")
	if len(acceptLanguageHeader) > 0 {
		headers["Accept-Language"] = acceptLanguageHeader
	}

	imsJWTToken := c.Req.Header.Get("X-Jwt-Token")
	imsJWTTokenHeader := c.Req.Header.Get("IMS-JWT-Token")
	if imsJWTTokenHeader != "" {
		imsJWTToken = imsJWTTokenHeader
	}
	if imsJWTToken != "" {
		headers.Set("IMS-JWT-Token", imsJWTToken)
	}

	result, err := hs.RenderService.CustomRenderCSV(c.Req.Context(), rendering.CustomCSVOpts{
		Timeout:         time.Duration(timeout) * time.Second,
		OrgId:           c.OrgId,
		UserId:          c.UserId,
		OrgRole:         c.OrgRole,
		Encoding:        queryReader.Get("encoding", ""),
		Timezone:        queryReader.Get("tz", ""),
		ConcurrentLimit: hs.Cfg.RendererConcurrentRequestLimit,
		Headers:         headers,
		UID:             queryReader.Get("uid", ""),
		From:            queryReader.Get("from", ""),
		To:              queryReader.Get("to", ""),
		PanelId:         queryReader.Get("panelId", ""),
		Variables:       queryReader.Get("variables", ""),
	})

	if err != nil {
		if errors.Is(err, rendering.ErrTimeout) {
			c.Handle(hs.Cfg, 500, err.Error(), err)
			return
		}
		c.Handle(hs.Cfg, 500, "Rendering failed.", err)
		return
	}

	c.Resp.Header().Set("Content-Type", "text/csv")
	http.ServeFile(c.Resp, c.Req, result.FilePath)
}
