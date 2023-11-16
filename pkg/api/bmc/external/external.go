package external

import (
	"github.com/grafana/grafana/pkg/infra/log"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/org"
	"os"
)

var logger = log.New("bmc.external")

var (
	imsServiceURL    = os.Getenv("IMS_SERVICE_URL")
	imsServiceAccKey = os.Getenv("IMS_SERVICE_ACCOUNT_KEY")
)

func GetTenantFeatures(ctx *contextmodel.ReqContext) ([]TenantFeatures, error) {
	return getTenantFeatures(ctx)
}

func GetIMSToken(ctx *contextmodel.ReqContext, tenantId, userId int64) (string, error) {
	return getIMSToken(ctx, tenantId, userId)
}

func GetImsUserInfo(ctx *contextmodel.ReqContext) (*ImsUserInfo, error) {
	return getImsUserInfo(ctx)
}

func SetImsUserInfo(ctx *contextmodel.ReqContext) (string, error) {
	return setImsUserInfo(ctx)
}

func FindUsersByEmails(ctx *contextmodel.ReqContext, emails []string) ([]*org.OrgUserDTO, error) {
	return findUsersByEmails(ctx, emails)
}

func FilterInternalUsersByEmails(ctx *contextmodel.ReqContext, emails []string) ([]string, error) {
	return filterInternalUsersByEmails(ctx, emails)
}
