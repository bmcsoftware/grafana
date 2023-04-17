package msp

import (
	"fmt"
	"strconv"
)

func Includes(id int64, ids []int64) bool {
	for _, i := range ids {
		if i == id {
			return true
		}
	}
	return false
}

func GetOrg0TeamID(id int64) int64 {
	value, err := strconv.ParseInt(fmt.Sprintf("%d0", id), 10, 64)
	if err != nil {
		return 0
	}
	return value
}
