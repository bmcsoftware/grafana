package msp

import (
	"fmt"
	"strconv"

	logger "github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/services/team"
	"github.com/grafana/grafana/pkg/setting"
)

var log = logger.New("msp")

type Service struct {
	store         sqlstore.Store
	teamService   team.Service
	Cfg           setting.Cfg
	AccessControl accesscontrol.AccessControl
}

func NewService(store sqlstore.Store, teamService team.Service, Cfg setting.Cfg, AccessControl accesscontrol.AccessControl) *Service {
	return &Service{store: store, teamService: teamService, Cfg: Cfg, AccessControl: AccessControl}
}

func GetMspOrgIdsFromCtx(ctx *models.ReqContext) []int64 {
	mspTeamIDs := make([]int64, 0)
	for _, mspOrgId := range ctx.SignedInUser.MspOrgs {
		mspTeamID := fmt.Sprintf("%d%s", ctx.OrgID, mspOrgId)
		id, err := strconv.ParseInt(mspTeamID, 10, 64)
		if err != nil {
			log.Error("Failed to parse msp team id", "error", err)
			continue
		}
		mspTeamIDs = append(mspTeamIDs, id)
	}
	return mspTeamIDs
}
