package bmc

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	misc "github.com/grafana/grafana/pkg/api/bmc/miscellaneous"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/web"
)

var Log = log.New("bmc-miscellaneous-api")

const (
	ERR_INVALID_VALUE_TYPE = "invalid value and its type"
	ERR_SQL_EXEC_FAILED    = "count not exec command "
)

const (
	Insert = iota
	Update
)

var OpeartionsString = map[string]int{
	"INSERT": Insert,
	"UPDATE": Update,
}

const (
	TypeInt = iota
	TypeString
	TypeFloat
	TypeBoolean
	TypeDate
)

var TypesStrings = map[string]int{
	"int":      TypeInt,
	"float":    TypeFloat,
	"boolean":  TypeBoolean,
	"string":   TypeString,
	"datetime": TypeDate,
}

func (p *PluginsAPI) RunUpsert(c *models.ReqContext) response.Response {
	cmd := misc.UPSERTDTO{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	if Insert != OpeartionsString[cmd.Opertaion] && Update != OpeartionsString[cmd.Opertaion] {
		return response.Error(http.StatusBadRequest, "invalid operation", nil)
	}

	switch OpeartionsString[cmd.Opertaion] {
	case Insert:
		return p.RunInsertSQL(c.Req.Context(), cmd)
	case Update:
		return p.RunUpdateSQL(c.Req.Context(), cmd)
	default:
		return response.Error(http.StatusBadRequest, "invalid operation", nil)
	}
}

func (p *PluginsAPI) RunInsertSQL(ctx context.Context, req misc.UPSERTDTO) response.Response {
	columns := []string{}
	values := []string{}
	columns, values, err := extractParameters(req.Parameters, columns, values)
	if err != nil {
		response.Error(http.StatusBadRequest, ERR_INVALID_VALUE_TYPE, err)
	}
	err = p.store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		if _, err := sess.Exec(fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s);",
			req.Table,
			strings.Join(columns, ", "),
			strings.Join(values, ", "),
		)); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return response.Error(http.StatusInternalServerError, ERR_SQL_EXEC_FAILED+err.Error(), err)
	}
	return response.Success("OK")
}

func (p *PluginsAPI) RunUpdateSQL(ctx context.Context, req misc.UPSERTDTO) response.Response {
	columns := []string{}
	values := []string{}
	whereCols := []string{}
	whereVals := []string{}

	columns, values, err := extractParameters(req.Parameters, columns, values)
	if err == nil {
		whereCols, whereVals, err = extractParameters(req.PrimaryParameters, whereCols, whereVals)
	}
	if err != nil {
		response.Error(http.StatusBadRequest, ERR_INVALID_VALUE_TYPE, err)
	}

	updateStatement := fmt.Sprintf("UPDATE %s SET %s WHERE %s;",
		req.Table,
		strings.Join(joinColVal(columns, values), ", "),
		strings.Join(joinColVal(whereCols, whereVals), " and "),
	)
	err = p.store.WithDbSession(ctx, func(sess *sqlstore.DBSession) error {
		if _, err := sess.Exec(updateStatement); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return response.Error(http.StatusInternalServerError, ERR_SQL_EXEC_FAILED+err.Error(), err)
	}
	return response.Success("OK")
}

func joinColVal(columns []string, values []string) []string {
	var pairs []string
	for i, col := range columns {
		pairs = append(pairs, fmt.Sprintf("%s = %s", col, values[i]))
	}
	return pairs
}

func extractParameters(params map[string]misc.PARAM, columns []string, values []string) ([]string, []string, error) {
	for key, val := range params {
		columns = append(columns, key)
		if TypesStrings[val.Type] == TypeString {
			values = append(values, fmt.Sprintf("'%s'", val.Value.(string)))
		} else {
			if v, err := getTypedValue(val); err != nil {
				return columns, values, err
			} else {
				values = append(values, v)
			}
		}
	}
	return columns, values, nil
}

func getTypedValue(v misc.PARAM) (string, error) {
	switch TypesStrings[v.Type] {
	case TypeInt:
		switch val := v.Value.(type) {
		case float64:
			return fmt.Sprintf("%d", int64(val)), nil
		default:
			return "", errors.New(ERR_INVALID_VALUE_TYPE)
		}
	case TypeFloat:
		switch val := v.Value.(type) {
		case float64:
			return fmt.Sprintf("%f", val), nil
		default:
			return "", errors.New(ERR_INVALID_VALUE_TYPE)
		}
	case TypeBoolean:
		switch val := v.Value.(type) {
		case bool:
			return fmt.Sprintf("%t", val), nil
		default:
			return "", errors.New(ERR_INVALID_VALUE_TYPE)
		}
	case TypeDate:
		{
			switch val := v.Value.(type) {
			case float64:
				dateVal := int64(val / 1000)
				parsedDate := time.Unix(dateVal, 0)
				return fmt.Sprintf("'%s'", fmt.Sprintf("%d-%02d-%02dT%02d:%02d:%02d",
					parsedDate.Year(), parsedDate.Month(), parsedDate.Day(),
					parsedDate.Hour(), parsedDate.Minute(), parsedDate.Second())), nil
			default:
				return "", errors.New(ERR_INVALID_VALUE_TYPE)
			}
		}
	default:
		return fmt.Sprintf("'%s'", v.Value.(string)), nil
	}
}
