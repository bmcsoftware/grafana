package api

import (
	"strconv"
	"time"

	"github.bmc.com/DSOM-ADE/authz-go"
	"github.com/grafana/grafana/pkg/api/routing"
	"github.com/grafana/grafana/pkg/middleware"
	"github.com/grafana/grafana/pkg/models"
)

const (
	TenanatFeatureCacheKey = "tenant_features_"
)

// @example: IsTenantFeatureEnabled(hs, "rms-metadata")
// Below utility function can be used to create in memory cache.
func IsTenantFeatureEnabled(hs *HTTPServer, featureName string) func(c *models.ReqContext) {
	return func(c *models.ReqContext) {
		cacheInstance := authz.GetInstance()
		cacheKey := TenanatFeatureCacheKey + strconv.Itoa(int(c.OrgID))
		if featureFlags, found := cacheInstance.Get(cacheKey); found {
			enabledFeatures := featureFlags.([]string)
			exists := false
			for _, val := range enabledFeatures {
				if val == featureName {
					exists = true
					break
				}
			}
			if !exists {
				c.JsonApiErr(403, "Permission denied", nil)
				return
			}
		} else {
			imsToken, err := GetIMSToken(c, c.OrgID, c.UserID)
			if err != nil {
				c.JsonApiErr(403, "Permission denied", nil)
				return
			}
			tenantFeatures := GetTenantFeaturesFromService(c.OrgID, imsToken)
			featureFlags := make([]string, 0)
			m := make(map[string]bool)
			for _, tf := range tenantFeatures {
				if tf.Status && !m[tf.Name] {
					m[tf.Name] = true
					featureFlags = append(featureFlags, tf.Name)
				}
			}
			cacheInstance.Set(cacheKey, featureFlags, 120*time.Minute)
			if !m[featureName] {
				c.JsonApiErr(403, "Permission denied", nil)
				return
			}
		}
	}
}

func (hs *HTTPServer) registerRMSMetadataRoutes() {
	reqSignedIn := middleware.ReqSignedIn
	reqOrgAdmin := middleware.ReqOrgAdmin
	reqEditorRole := middleware.ReqEditorRole

	r := hs.RouteRegister

	r.Group("/api/rmsmetadata", func(apiRoute routing.RouteRegister) {
		// Register admin persona routes to below group with admin permission
		apiRoute.Group("/adminop", func(adminRoute routing.RouteRegister) {}, reqOrgAdmin)

		// Register user persona routes to below group with editor permission
		apiRoute.Group("/view", func(userPersonaRoute routing.RouteRegister) {
			userPersonaRoute.Get("/list", routing.Wrap(hs.GetViewList))
			userPersonaRoute.Get("/:viewID", routing.Wrap(hs.GetViewDetails))
		}, reqEditorRole)
	}, reqSignedIn)
}
