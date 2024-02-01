package routing

import (
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/web"
)

var (
	ServerError = func(err error) response.Response {
		return response.Error(500, "Server error", err)
	}
)

func Wrap(handler func(c *models.ReqContext) response.Response) web.Handler {
	return func(c *models.ReqContext) {
		if res := handler(c); res != nil {
			res.WriteTo(c)
		}
	}
}

func WrapWithMspCheck(mspHandler func(c *models.ReqContext) response.Response,
	handler func(c *models.ReqContext) response.Response) web.Handler {
	return func(c *models.ReqContext) {
		if c.SignedInUser.HasExternalOrg && !c.SignedInUser.IsOrg0User {
			if res := mspHandler(c); res != nil {
				res.WriteTo(c)
			}
		} else {
			if res := handler(c); res != nil {
				res.WriteTo(c)
			}
		}
	}
}

func ConditionedWrap(
	mspHandler func(c *models.ReqContext) response.Response,
	handler func(c *models.ReqContext) response.Response,
	condition func(c *models.ReqContext) bool,
) web.Handler {
	return func(c *models.ReqContext) {
		if condition(c) {
			if res := mspHandler(c); res != nil {
				res.WriteTo(c)
			}
		} else {
			if res := handler(c); res != nil {
				res.WriteTo(c)
			}
		}
	}
}
