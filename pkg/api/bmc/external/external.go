package external

import (
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/org"
	"os"
)

var logger = log.New("bmc.external")

var (
	imsServiceURL    = os.Getenv("IMS_SERVICE_URL")
	imsServiceAccKey = os.Getenv("IMS_SERVICE_ACCOUNT_KEY")
)

func GetTenantFeatures(ctx *models.ReqContext) ([]TenantFeatures, error) {
	return getTenantFeatures(ctx)
}

func GetIMSToken(ctx *models.ReqContext, tenantId, userId int64) (string, error) {
	return getIMSToken(ctx, tenantId, userId)
}

func GetImsUserInfo(ctx *models.ReqContext) (*ImsUserInfo, error) {
	return getImsUserInfo(ctx)
}

func SetImsUserInfo(ctx *models.ReqContext) (string, error) {
	return setImsUserInfo(ctx)
}

func FindUsersByEmails(ctx *models.ReqContext, emails []string) ([]*org.OrgUserDTO, error) {
	return findUsersByEmails(ctx, emails)
}

func FilterInternalUsersByEmails(ctx *models.ReqContext, emails []string) ([]string, error) {
	return filterInternalUsersByEmails(ctx, emails)
}
