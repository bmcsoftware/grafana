/*
 * Copyright (C) 2022 BMC Software Inc
 * Added by ymulthan at 4/12/2022
 */

package models

type FeatureStatus struct {
	FeatureName string `json:"featureName"`
	Status      bool   `json:"status"`
	OrgId       int64  `json:"orgId"`
	Id          int64  `json:"id"`
}

type GetFeatureStatus struct {
	OrgId  int64
	Result []*FeatureStatus
}

type SetFeatureStatus struct {
	OrgId int64
	Data  FeatureStatus `xorm:"extends"`
}

type RefreshFeatureStatus struct {
	OrgId int64
}
