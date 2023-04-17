/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by kmejdi at 29/7/2021
 */

package models

type CustomConfiguration struct {
	DocLink       string `xorm:"doc_link"`
	SupportLink   string `xorm:"support_link"`
	CommunityLink string `xorm:"community_link"`
	VideoLink     string `xorm:"video_link"`
}

type GetCustomConfiguration struct {
	OrgId  int64
	Result *CustomConfiguration
}

type SetCustomConfiguration struct {
	OrgId int64
	Data  CustomConfiguration `xorm:"extends"`
}

type RefreshCustomConfiguration struct {
	OrgId int64
}
