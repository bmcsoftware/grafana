/*
 * Copyright (C) 2023 BMC Software Inc
 * Added by kmejdi at 12/20/2023
 */

package contextmodel

import "fmt"

func (ctx *ReqContext) HasBHDPermission(resource string, action string) bool {
	if ctx.IsGrafanaAdmin {
		return true
	}
	// ctx.Rbac is a map of string:boolean. check if the key exists and the value is true
	permission := resource + ":" + action
	if val, ok := ctx.Rbac[permission]; ok && val {
		return true
	}
	return false
}

func (ctx *ReqContext) HasBHDScopePermission(uid string, resource string, action string) bool {
	if ctx.IsGrafanaAdmin {
		return true
	}
	// ctx.Rbac is a map of string:boolean. check if the key exists and the value is true
	permission := fmt.Sprintf("%s:%s:%s", uid, resource, action)
	if val, ok := ctx.Rbac[permission]; ok && val {
		return true
	}
	return false
}
