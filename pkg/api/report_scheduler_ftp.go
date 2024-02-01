package api

import (
	"encoding/base64"
	"errors"
	"github.com/grafana/grafana/pkg/bmc/kafkaproducer"
	"github.com/grafana/grafana/pkg/components/simplejson"
	"net/http"
	"net/url"
	"strconv"
	"time"

	goval "github.com/asaskevich/govalidator"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/bmc/ftp"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

func init() {
	goval.SetFieldsRequiredByDefault(true)
}

func (hs *HTTPServer) GetFTPConfig(c *models.ReqContext) response.Response {
	if c.OrgRole == "Viewer" || c.OrgRole == "Editor" {
		return response.Error(403, "Unauthorized: User do not have permission to perform this action", nil)
	}

	query := &models.GetFTPConfig{
		OrgId: c.OrgID,
	}
	if err := hs.SQLStore.GetFTPConfig(c.Req.Context(), query); err != nil {
		return hs.FailResponse(err)
	}
	return hs.SuccessResponse(query.Result)
}

func (hs *HTTPServer) SetFTPConfig(c *models.ReqContext) response.Response {
	cmd := &models.SetFTPConfigCmd{}
	if err := web.Bind(c.Req, cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request payload", err)
	}

	if c.OrgRole == "Viewer" || c.OrgRole == "Editor" {
		return response.Error(403, "Unauthorized: User do not have permission to perform this action", nil)
	}

	cmd.OrgID = c.OrgID
	if err := PingFTP(&models.ModifyFTPConfigCmd{
		Host:     cmd.Host,
		Port:     cmd.Port,
		Username: cmd.Username,
		Password: cmd.Password,
	}); err != nil {
		return response.Error(http.StatusBadGateway, "Failed to connect to FTP server", err)
	}

	if err := hs.SQLStore.SetFTPConfig(c.Req.Context(), cmd); err != nil {
		return response.Error(500, "Failed to Update FTP Configuration", err)
	}
	return response.JSON(200, &util.DynMap{"message": "FTP configuration saved successfully"})

}

func (hs *HTTPServer) ModifyFTPConfig(c *models.ReqContext) response.Response {

	preValue := &models.GetFTPConfig{
		OrgId: c.OrgID,
	}
	if err := hs.SQLStore.GetFTPConfig(c.Req.Context(), preValue); err != nil {
		logger.Error("Failed to get previous FTP configuration")
	}

	cmd := &models.ModifyFTPConfigCmd{}
	if err := web.Bind(c.Req, cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request payload", err)
	}

	if c.OrgRole == "Viewer" || c.OrgRole == "Editor" {
		return response.Error(http.StatusForbidden, "Unauthorized: User do not have permission to perform this action", nil)
	}

	cmd.OrgID = c.OrgID
	if err := PingFTP(cmd); err != nil {
		loginName := c.SignedInUser.Name
		if len(loginName) == 0 {
			loginName = c.SignedInUser.Login
		}
		data := kafkaproducer.Data{
			AuditCategory:    "REPORTS_SETTING",
			ObjectID:         "Reports FTP Setting",
			TenantID:         strconv.FormatInt(c.OrgID, 10),
			ObjectCategory:   "Reports FTP Configuration",
			ObjectName:       "Reports FTP Configuration",
			ObjectType:       "Reports FTP Configuration",
			ObjectDetails:    "FTP setting for organization",
			Operation:        c.Context.Req.Method,
			OperationSubType: "Failed to update FTP configuration with error: " + err.Error(),
			OperationType:    "REPORTS_FTP_SETTING",
			OperationStatus:  "FAILED",
			ActorUserID:      strconv.FormatInt(c.UserID, 10),
			ActorLoginID:     loginName,
			Source:           kafkaproducer.LookUpIp(c.Req.Header.Get("Origin")),
		}
		instance := kafkaproducer.GetInstance()
		instance.SendKafkaEvent(data)

		return response.Error(http.StatusRequestTimeout, "Failed to connect to FTP server", err)
	}

	if err := hs.SQLStore.ModifyFTPConfig(c.Req.Context(), cmd); err != nil {

		loginName := c.SignedInUser.Name
		if len(loginName) == 0 {
			loginName = c.SignedInUser.Login
		}
		data := kafkaproducer.Data{
			AuditCategory:    "REPORTS_SETTING",
			ObjectID:         "Reports FTP Setting",
			TenantID:         strconv.FormatInt(c.OrgID, 10),
			ObjectCategory:   "Reports FTP Configuration",
			ObjectName:       "Reports FTP Configuration",
			ObjectType:       "Reports FTP Configuration",
			ObjectDetails:    "FTP setting for organization",
			Operation:        c.Context.Req.Method,
			OperationSubType: "Failed to update FTP configuration with error: " + err.Error(),
			OperationType:    "REPORTS_FTP_SETTING",
			OperationStatus:  "FAILED",
			ActorUserID:      strconv.FormatInt(c.UserID, 10),
			ActorLoginID:     loginName,
			Source:           kafkaproducer.LookUpIp(c.Req.Header.Get("Origin")),
		}
		instance := kafkaproducer.GetInstance()
		instance.SendKafkaEvent(data)

		return response.Error(http.StatusInternalServerError, "Failed to Update FTP Configuration", err)
	}

	loginName := c.SignedInUser.Name
	if len(loginName) == 0 {
		loginName = c.SignedInUser.Login
	}
	newValue := &models.GetFTPConfig{
		OrgId: c.OrgID,
	}
	if err := hs.SQLStore.GetFTPConfig(c.Req.Context(), newValue); err != nil {
		logger.Error("Failed to get updated FTP configuration")
	}
	data := kafkaproducer.Data{
		AuditCategory:    "REPORTS_SETTING",
		ObjectID:         "Reports FTP Setting",
		TenantID:         strconv.FormatInt(c.OrgID, 10),
		ObjectCategory:   "Reports FTP Configuration",
		ObjectName:       "Reports FTP Configuration",
		ObjectType:       "Reports FTP Configuration",
		ObjectDetails:    "FTP setting for organization",
		Operation:        c.Context.Req.Method,
		OperationSubType: "FTP configuration updated successfully",
		OperationType:    "REPORTS_FTP_SETTING",
		OperationStatus:  "SUCCESS",
		ActorUserID:      strconv.FormatInt(c.UserID, 10),
		ActorLoginID:     loginName,
		Source:           kafkaproducer.LookUpIp(c.Req.Header.Get("Origin")),
		ChangeValues: &kafkaproducer.ChangeValues{
			PreviousValue: simplejson.NewFromAny(preValue.Result),
			NewValue:      simplejson.NewFromAny(newValue),
		},
	}
	instance := kafkaproducer.GetInstance()
	instance.SendKafkaEvent(data)

	return response.JSON(http.StatusOK, &util.DynMap{"message": "FTP configuration updated successfully"})
}

func PingFTP(cmd *models.ModifyFTPConfigCmd) error {

	parsedUrl, err := url.Parse(cmd.Host)
	if err != nil {
		return errors.New("Failed to parse FTP URL")
	}

	//IP Address Check for host name field
	if goval.IsIP(parsedUrl.Host) {
		return errors.New("Validation Error: IP Address is not allowed as server host")
	}

	// connectivity validation
	decodedPwd, err := base64.StdEncoding.DecodeString(cmd.Password)
	if err != nil {
		logger.Info("Error occurred while retrieving FTP user details", err.Error())
		return errors.New("Error occurred while retrieving FTP user details")
	}

	scheme := "ftp"
	if parsedUrl.Scheme == "sftp" {
		scheme = parsedUrl.Scheme
	}

	config := ftp.ConnConfig{
		Protocol:      scheme,
		Host:          parsedUrl.Host,
		Port:          cmd.Port,
		User:          cmd.Username,
		Password:      string(decodedPwd),
		Timeout:       60 * time.Second,
		IgnoreHostKey: true,
	}
	instance, err := ftp.NewInstance(config)
	if err != nil {
		return err
	}
	defer instance.Close()

	if err := instance.Ping(); err != nil {
		return err
	}

	return nil
}

func getNewFTPSetting(cmd *models.ModifyFTPConfigCmd) *models.ModifyFTPConfigCmd {
	newFTPSetting := cmd
	newFTPSetting.Password = "*******"
	return newFTPSetting
}
