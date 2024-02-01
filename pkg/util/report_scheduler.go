package util

import (
	"errors"
	"fmt"
	"github.com/cortexproject/cortex/pkg/util"
	"github.com/gorhill/cronexpr"
	//"github.com/grafana/grafana/pkg/web"
	"github.com/microcosm-cc/bluemonday"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	Hourly                 = 1
	Daily                  = 2
	Weekly                 = 3
	Monthly                = 4
	UnimplementedFrequency = errors.New("unimplemented frequency")
)

func GetCronExpr(frequency int, time string, days []int, months []int) (string, error) {
	var hour string
	var minute string
	if frequency != Hourly {
		data := strings.Split(time, ":")
		hour = data[0]
		minute = data[1]
	} else {
		minute = time
	}

	var cronExpr string
	if frequency == Hourly {
		cronExpr = fmt.Sprintf("%v 0/1 * * *", minute)
	} else if frequency == Daily {
		cronExpr = fmt.Sprintf("%v %v * * *", minute, hour)
	} else if frequency == Weekly {
		cronExpr = fmt.Sprintf("%v %v * * %v", minute, hour, JoinItoa(days))
	} else if frequency == Monthly {
		cronExpr = fmt.Sprintf("%v %v %v %v *", minute, hour, JoinItoa(days), JoinItoa(months))
	} else {
		return "", UnimplementedFrequency
	}
	return cronExpr, nil
}
func GetNextAt(cronExpr string, timeZone string) (time.Time, error) {
	// utc in lowercase is not recognized by Go
	if strings.ToLower(timeZone) == "utc" {
		timeZone = "UTC"
	}

	// Load timezone
	loadZone, err := time.LoadLocation(timeZone)

	if err != nil {
		return time.Time{}, err
	}

	// Parse the cronExpr
	cronParsed, err := cronexpr.Parse(cronExpr)
	if err != nil {
		return time.Time{}, err
	}

	// Target current time is most likely the start time.
	targetTime := time.Now().UTC().In(loadZone)

	// Next job execution of the target from target time
	targetNextAt := cronParsed.Next(targetTime)

	// Target next job execution to UTC
	utcTime := targetNextAt.UTC()

	return utcTime, nil
}

func UnixToTime(unix int64) *time.Time {
	if unix != 0 {
		unixTime := time.Unix(unix, 0).UTC()
		return &unixTime
	}
	return nil
}

func SanitizeHtml(value string) string {
	p := bluemonday.UGCPolicy()
	p.AllowURLSchemes("mailto", "http", "https")
	p.SkipElementsContent("input", "textarea")
	p.RequireNoFollowOnLinks(true)
	return p.Sanitize(value)
}

func DomainValidator(value string) bool {
	RegExp := regexp.MustCompile(`^(([a-zA-Z]{1})|([a-zA-Z]{1}[a-zA-Z]{1})|([a-zA-Z]{1}[0-9]{1})|([0-9]{1}[a-zA-Z]{1})|([a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9]))\.([a-zA-Z]{2,6}|[a-zA-Z0-9-]{2,30}\.[a-zA-Z
 ]{2,3})$`)
	return RegExp.MatchString(value)
}

func EmailDomainValidator(emails, domains []string) []string {
	var validEmailIds []string
	for _, recipient := range emails {
		parts := strings.Split(recipient, "@")
		if len(parts) == 2 {
			domain := parts[1]
			if util.StringsContain(domains, domain) {
				validEmailIds = append(validEmailIds, recipient)
			}
		}
	}
	return validEmailIds
}

func ParamsInt64(value string) (int64, error) {
	return strconv.ParseInt(value, 10, 64)
}

func ParamsBool(value string) (bool, error) {
	return strconv.ParseBool(value)
}

func Contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func RemoveDuplicates(strList []string) []string {
	list := make([]string, 0)
	for _, item := range strList {
		if !Contains(list, item) {
			list = append(list, item)
		}
	}
	return list
}
