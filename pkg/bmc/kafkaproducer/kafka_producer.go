package kafkaproducer

import (
	"encoding/json"
	"github.com/confluentinc/confluent-kafka-go/kafka"
	"github.com/grafana/grafana/pkg/infra/log"
	"net"
	"net/url"
	"os"
	"sync"
	"time"
)

var once sync.Once
var producerSvc *KafkaProducer

type KafkaProducer struct {
	Producer *kafka.Producer
	Error    error
	Log      log.Logger
}

func GetInstance() *KafkaProducer {
	once.Do(func() {
		producer, producerErr := kafka.NewProducer(&kafka.ConfigMap{
			"bootstrap.servers": getKafkaServer(),
		})
		producerSvc = &KafkaProducer{
			Producer: producer,
			Error:    producerErr,
			Log:      log.New("AuditRecord"),
		}
	})
	return producerSvc
}

func getKafkaServer() string {
	return os.Getenv("REPORTING_KAFKA_SERVER")
}

func getTopicName() string {
	return os.Getenv("AUDIT_KAFKA_TOPIC")
}

func (p *KafkaProducer) SendKafkaEvent(data Data) {
	if p.Error != nil {
		p.Log.Error("Failed to get kafka producer", "Error", p.Error)
		return
	}
	data.AppID = "Dashboards"
	auditEvent := CreateAuditEvent{
		EventType:   "CREATE_AUDIT_RECORD",
		Description: "Event from dashboard service",
		Data:        data,
	}
	auditEventByte, byteErr := json.Marshal(auditEvent)
	p.Log.Info("Audit event -", "event", string(auditEventByte))

	if byteErr != nil {
		p.Log.Error("Error in converting audit event in byte:", "Error", byteErr)
	}

	Topic := getTopicName()
	err := p.Producer.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &Topic, Partition: kafka.PartitionAny},
		Value:          auditEventByte,
		Key:            []byte("CREATE_AUDIT_RECORD"),
		Timestamp:      time.Now().UTC(),
		TimestampType:  0,
		Opaque:         nil,
		Headers: []kafka.Header{
			{Key: "EVENT_TYPE", Value: []byte("CREATE_AUDIT_RECORD")},
		},
	}, nil)
	if err != nil {
		p.Log.Error("Audit event failed", "Error", err)
		return
	} else {
		p.Log.Info("Audit event sent successfully")
		return
	}
	p.Producer.Flush(15 * 1000)
}

func LookUpIp(origin string) string {
	parsedUrl, err := url.Parse(origin)
	if err != nil {
		return origin
	}
	hostname := parsedUrl.Hostname()
	ipAddr, err := net.LookupIP(hostname)
	if err != nil {
		return hostname
	}
	return ipAddr[0].String()
}
