package rendering

// @description BMC Custom code
// @author kmejdi

import (
	"context"
	"fmt"
	"github.com/grafana/grafana/pkg/infra/metrics"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/setting"
	"math"
	"net/url"
	"path/filepath"
	"strconv"
	"sync/atomic"
	"time"
)

const RenderPDF RenderType = "pdf"

type customPDFFunc func(ctx context.Context, renderKey string, options CustomPDFOpts) (*RenderResult, error)
type customCSVFunc func(ctx context.Context, renderKey string, options CustomCSVOpts) (*RenderResult, error)

type CustomPDFOpts struct {
	Timeout           time.Duration
	OrgId             int64
	UserId            int64
	OrgRole           models.RoleType
	Path              string
	Encoding          string
	Timezone          string
	ConcurrentLimit   int
	DeviceScaleFactor float64
	Headers           map[string][]string

	UID         string
	ReportName  string
	Description string
	From        string
	To          string
	CompanyLogo string
	FooterText  string
	FooterURL   string
	Theme       string
	Layout      string
	Orientation string
	Variables   string
}
type CustomCSVOpts struct {
	Timeout         time.Duration
	OrgId           int64
	UserId          int64
	OrgRole         models.RoleType
	Path            string
	Encoding        string
	Timezone        string
	ConcurrentLimit int
	Headers         map[string][]string

	UID       string
	PanelId   string
	From      string
	To        string
	Variables string
}

func (rs *RenderingService) customPDFViaHTTP(ctx context.Context, renderKey string, opts CustomPDFOpts) (*RenderResult, error) {
	filePath, err := rs.getNewFilePath(RenderPDF)
	if err != nil {
		return nil, err
	}

	rendererURL, err := url.Parse(rs.Cfg.RendererUrl + "/pdf")
	if err != nil {
		return nil, err
	}

	opts.Path = rs.getDashURL(opts.UID, opts.OrgId, opts.From, opts.To, opts.Variables)

	queryParams := rendererURL.Query()
	queryParams.Add("renderKey", renderKey)
	queryParams.Add("domain", rs.domain)
	queryParams.Add("timezone", isoTimeOffsetToPosixTz(opts.Timezone))
	queryParams.Add("encoding", opts.Encoding)
	queryParams.Add("timeout", strconv.Itoa(int(opts.Timeout.Seconds())))
	queryParams.Add("deviceScaleFactor", fmt.Sprintf("%f", opts.DeviceScaleFactor))

	queryParams.Add("url", opts.Path)
	queryParams.Add("name", opts.ReportName)
	queryParams.Add("description", opts.Description)
	queryParams.Add("from", opts.From)
	queryParams.Add("to", opts.To)
	queryParams.Add("companyLogo", opts.CompanyLogo)
	queryParams.Add("footerText", opts.FooterText)
	queryParams.Add("footerURL", opts.FooterURL)
	queryParams.Add("theme", opts.Theme)
	queryParams.Add("layout", opts.Layout)
	queryParams.Add("orientation", opts.Orientation)

	rendererURL.RawQuery = queryParams.Encode()
	// gives service some additional time to timeout and return possible errors.
	reqContext, cancel := context.WithTimeout(ctx, opts.Timeout+time.Second*2)
	defer cancel()

	resp, err := rs.doRequest(reqContext, rendererURL, opts.Headers)
	if err != nil {
		return nil, err
	}

	// save response to file
	defer func() {
		if err := resp.Body.Close(); err != nil {
			rs.log.Warn("Failed to close response body", "err", err)
		}
	}()

	err = rs.readFileResponse(reqContext, resp, filePath)
	if err != nil {
		return nil, err
	}

	return &RenderResult{FilePath: filePath}, nil
}
func (rs *RenderingService) customCSVViaHTTP(ctx context.Context, renderKey string, opts CustomCSVOpts) (*RenderResult, error) {
	filePath, err := rs.getNewFilePath(RenderCSV)
	if err != nil {
		return nil, err
	}

	rendererURL, err := url.Parse(rs.Cfg.RendererUrl + "/rs_csv")
	if err != nil {
		return nil, err
	}

	opts.Path = rs.getPanelURL(opts.OrgId, opts.UID, opts.PanelId, opts.From, opts.To, opts.Variables)

	queryParams := rendererURL.Query()
	queryParams.Add("renderKey", renderKey)
	queryParams.Add("domain", rs.domain)
	queryParams.Add("timezone", isoTimeOffsetToPosixTz(opts.Timezone))
	queryParams.Add("encoding", opts.Encoding)
	queryParams.Add("timeout", strconv.Itoa(int(opts.Timeout.Seconds())))

	queryParams.Add("url", opts.Path)
	queryParams.Add("from", opts.From)
	queryParams.Add("to", opts.To)
	rendererURL.RawQuery = queryParams.Encode()

	// gives service some additional time to timeout and return possible errors.
	reqContext, cancel := context.WithTimeout(ctx, opts.Timeout+time.Second*2)
	defer cancel()

	resp, err := rs.doRequest(reqContext, rendererURL, opts.Headers)
	if err != nil {
		return nil, err
	}

	// save response to file
	defer func() {
		if err := resp.Body.Close(); err != nil {
			rs.log.Warn("Failed to close response body", "err", err)
		}
	}()

	err = rs.readFileResponse(reqContext, resp, filePath)
	if err != nil {
		return nil, err
	}

	return &RenderResult{FilePath: filePath}, nil
}

func (rs *RenderingService) CustomRenderPDF(ctx context.Context, opts CustomPDFOpts) (*RenderResult, error) {
	startTime := time.Now()
	result, err := rs.customRenderPDF(ctx, opts)

	elapsedTime := time.Since(startTime).Milliseconds()
	saveMetrics(elapsedTime, err, RenderPDF)

	return result, nil
}
func (rs *RenderingService) customRenderPDF(ctx context.Context, opts CustomPDFOpts) (*RenderResult, error) {
	if int(atomic.LoadInt32(&rs.inProgressCount)) > opts.ConcurrentLimit {
		return &RenderResult{
			FilePath: filepath.Join(setting.HomePath, "public/img/rendering_limit.png"),
		}, nil
	}

	if !rs.IsAvailable() {
		rs.log.Warn("Could not render pdf, no image renderer found/installed. " +
			"For pdf rendering support please install the renderer plugin. ")
		return rs.renderUnavailableImage(), nil
	}

	rs.log.Info("Rendering", "path", opts.Path, "orgId", opts.OrgId, "dashboard", opts.UID, "report", opts.ReportName)
	if math.IsInf(opts.DeviceScaleFactor, 0) || math.IsNaN(opts.DeviceScaleFactor) || opts.DeviceScaleFactor <= 0 {
		opts.DeviceScaleFactor = 1
	}
	renderKey, err := rs.generateAndStoreRenderKey(opts.OrgId, opts.UserId, opts.OrgRole)
	if err != nil {
		return nil, err
	}

	defer rs.deleteRenderKey(renderKey)

	defer func() {
		rs.inProgressCount--
		metrics.MRenderingQueue.Set(float64(rs.inProgressCount))
	}()

	rs.inProgressCount++
	metrics.MRenderingQueue.Set(float64(rs.inProgressCount))
	return rs.customPDFAction(ctx, renderKey, opts)
}

func (rs *RenderingService) CustomRenderCSV(ctx context.Context, opts CustomCSVOpts) (*RenderResult, error) {
	startTime := time.Now()
	result, err := rs.customRenderCSV(ctx, opts)

	elapsedTime := time.Since(startTime).Milliseconds()
	saveMetrics(elapsedTime, err, RenderCSV)

	return result, nil
}
func (rs *RenderingService) customRenderCSV(ctx context.Context, opts CustomCSVOpts) (*RenderResult, error) {
	if int(atomic.LoadInt32(&rs.inProgressCount)) > opts.ConcurrentLimit {
		return &RenderResult{
			FilePath: filepath.Join(setting.HomePath, "public/img/rendering_limit.png"),
		}, nil
	}

	if !rs.IsAvailable() {
		rs.log.Warn("Could not render csv, no image renderer found/installed. " +
			"For csv rendering support please install the renderer plugin. ")
		return rs.renderUnavailableImage(), nil
	}

	rs.log.Info("Rendering", "path", opts.Path, "orgId", opts.OrgId, "dashboard", opts.UID, "panelId", opts.PanelId)
	renderKey, err := rs.generateAndStoreRenderKey(opts.OrgId, opts.UserId, opts.OrgRole)
	if err != nil {
		return nil, err
	}

	defer rs.deleteRenderKey(renderKey)

	defer func() {
		rs.inProgressCount--
		metrics.MRenderingQueue.Set(float64(rs.inProgressCount))
	}()

	rs.inProgressCount++
	metrics.MRenderingQueue.Set(float64(rs.inProgressCount))
	return rs.customCSVAction(ctx, renderKey, opts)
}

func (rs *RenderingService) getDashURL(uid string, orgId int64, from string, to string, variables string) string {
	values := url.Values{}

	values.Add("orgId", fmt.Sprintf("%v", orgId))
	values.Add("from", from)
	values.Add("to", to)

	return fmt.Sprintf("%sd/%s/_?%s&%s", rs.Cfg.RendererCallbackUrl, uid, values.Encode(), variables)
}
func (rs *RenderingService) getPanelURL(orgId int64, uid, panelId, from, to, variables string) string {
	values := url.Values{}

	values.Add("orgId", fmt.Sprintf("%v", orgId))
	values.Add("from", from)
	values.Add("to", to)

	values.Add("inspectTab", "data")
	values.Add("viewPanel", panelId)
	values.Add("inspect", panelId)

	return fmt.Sprintf("%sd/%s/_?%s&%s", rs.Cfg.RendererCallbackUrl, uid, values.Encode(), variables)
}
