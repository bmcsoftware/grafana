package kafkaproducer

import (
	"fmt"
	"github.com/grafana/grafana/pkg/components/simplejson"
	"time"
)

type CreateAuditEvent struct {
	EventType   string `json:"event_type"`
	Description string `json:"description"`
	Data        Data   `json:"data"`
}
type EventTime time.Time

type Data struct {
	AuditCategory    string       `json:"audit_category"`
	ObjectID         string       `json:"object_id"`
	AppID            string       `json:"app_id"`
	TenantID         string       `json:"tenant_id"`
	ObjectName       string       `json:"object_name"`
	ObjectType       string       `json:"object_type"`
	ObjectCategory   string       `json:"object_category"`
	ObjectDetails    string       `json:"object_details"`
	Operation        string       `json:"operation"`
	OperationType    string       `json:"operation_type"`
	OperationSubType string       `json:"operation_sub_type"`
	OperationStatus  string       `json:"operation_status"`
	Description      string       `json:"description"`
	ActorUserID      string       `json:"actor_user_id"`
	ActorLoginID     string       `json:"actor_login_id"`
	ActivityTime     EventTime    `json:"activity_time"`
	TransactionID    string       `json:"transaction_id"`
	Source           string       `json:"source"`
	ChangeValues     ChangeValues `json:"change_values"`
}

type ChangeValues struct {
	PreviousValue *simplejson.Json `json:"previous_value"`
	NewValue      *simplejson.Json `json:"new_value"`
}

func (t EventTime) MarshalJSON() ([]byte, error) {
	formatted := time.Time(t).Format("2006-01-02T15:04:05.000Z")
	return []byte(fmt.Sprintf(`"%s"`, formatted)), nil
}
