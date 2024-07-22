package kafkaproducer

import (
	"github.com/grafana/grafana/pkg/components/simplejson"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"strconv"
)

type EventType int

const (
	DataSourceAddEvent EventType = iota
	DataSourceUpdateEvent
	DataSourceDeleteEvent
	PreferencesEvent
	ReportBrandingSettingsEvent
	ReportFtpSettingsEvent
)

type EventMetadata struct {
	AuditCategory string
	OperationType string
	ObjectName    string
	ObjectDetails string
}

func (t EventType) toMeta() *EventMetadata {
	switch t {
	case DataSourceAddEvent:
		return &EventMetadata{
			AuditCategory: "DATASOURCE",
			OperationType: "ADD_DATASOURCE",
			ObjectName:    "Datasource",
			ObjectDetails: "Datasource of type: %s",
		}
	case DataSourceUpdateEvent:
		return &EventMetadata{
			AuditCategory: "DATASOURCE",
			OperationType: "UPDATE_DATASOURCE",
			ObjectName:    "Datasource",
			ObjectDetails: "Datasource of type: %s",
		}
	case DataSourceDeleteEvent:
		return &EventMetadata{
			AuditCategory: "DATASOURCE",
			OperationType: "DELETE_DATASOURCE",
			ObjectName:    "Datasource",
			ObjectDetails: "Datasource of type: %s",
		}
	case PreferencesEvent:
		return &EventMetadata{
			AuditCategory: "PREFERENCES",
			OperationType: "ORG_PREFERENCES",
			ObjectName:    "Organization Preferences",
			ObjectDetails: "Change in organization preference",
		}
	case ReportBrandingSettingsEvent:
		return &EventMetadata{
			AuditCategory: "REPORTS_SETTING",
			OperationType: "REPORTS_BRANDING_SETTING",
			ObjectName:    "Reports Branding Setting",
			ObjectDetails: "Branding setting for organization",
		}
	case ReportFtpSettingsEvent:
		return &EventMetadata{
			AuditCategory: "REPORTS_SETTING",
			OperationType: "REPORTS_FTP_SETTING",
			ObjectName:    "Reports FTP Setting",
			ObjectDetails: "FTP setting for organization",
		}
	default:
		return &EventMetadata{
			AuditCategory: "UNKNOWN",
			OperationType: "UNKNOWN_OPERATION",
			ObjectName:    "N/A",
			ObjectDetails: "N/A",
		}
	}
}

type EventOpt struct {
	Ctx              *contextmodel.ReqContext
	AuditCategory    string
	ObjectID         string
	ObjectCategory   string
	ObjectName       string
	ObjectType       string
	ObjectDetails    string
	OperationType    string
	OperationStatus  string
	OperationSubType string
	Prev             interface{}
	New              interface{}
	Err              error
}

func (t EventType) Send(opt EventOpt) {
	instance := GetInstance()
	if opt.Ctx == nil || instance == nil {
		return
	}
	tenantID := strconv.FormatInt(opt.Ctx.OrgID, 10)
	userID := strconv.FormatInt(opt.Ctx.UserID, 10)
	loginName := opt.Ctx.SignedInUser.Name
	if len(loginName) == 0 {
		loginName = opt.Ctx.SignedInUser.Login
	}

	meta := t.toMeta()
	eventData := Data{
		AuditCategory:  meta.AuditCategory,
		ObjectID:       meta.ObjectName,
		ObjectCategory: meta.ObjectName,
		ObjectName:     meta.ObjectName,
		ObjectType:     meta.ObjectName,
		ObjectDetails:  meta.ObjectDetails,
		Operation:      opt.Ctx.Context.Req.Method,
		OperationType:  meta.OperationType,
		ActorUserID:    userID,
		ActorLoginID:   loginName,
		TenantID:       tenantID,
		Source:         LookUpIp(opt.Ctx.Req.Header.Get("Origin")),
	}

	if opt.Err != nil {
		eventData.OperationStatus = "FAILED"
		eventData.OperationSubType = "Failed to run operation: " + opt.Err.Error()
	} else {
		eventData.OperationStatus = "SUCCESS"
		eventData.OperationSubType = "Successfully run operation"
		eventData.ChangeValues = &ChangeValues{
			PreviousValue: simplejson.NewFromAny(opt.Prev),
			NewValue:      simplejson.NewFromAny(opt.New),
		}
	}

	if opt.AuditCategory != "" {
		eventData.AuditCategory = opt.AuditCategory
	}
	if opt.ObjectID != "" {
		eventData.ObjectID = opt.ObjectID
	}
	if opt.ObjectCategory != "" {
		eventData.ObjectCategory = opt.ObjectCategory
	}
	if opt.ObjectName != "" {
		eventData.ObjectName = opt.ObjectName
	}
	if opt.ObjectType != "" {
		eventData.ObjectType = opt.ObjectType
	}
	if opt.ObjectDetails != "" {
		eventData.ObjectDetails = opt.ObjectDetails
	}
	if opt.OperationType != "" {
		eventData.OperationType = opt.OperationType
	}
	if opt.OperationStatus != "" {
		eventData.OperationStatus = opt.OperationStatus
	}
	if opt.OperationSubType != "" {
		eventData.OperationSubType = opt.OperationSubType
	}

	instance.SendKafkaEvent(eventData)
}
