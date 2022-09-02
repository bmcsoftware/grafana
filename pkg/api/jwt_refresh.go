package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/setting"
	"io/ioutil"
	"net/http"
)

func (hs *HTTPServer) RefreshJWTToken(c *models.ReqContext, old dtos.IMSPayload) response.Response {

	if old.Token == "" {
		return response.Error(401, "Unauthorized - Old Token is empty", nil)
	}
	refreshedToken := RefreshJWTFromIMS(old.Token)
	return response.JSON(200, refreshedToken)
}

func RefreshJWTFromIMS(oldToken string) (refreshedToken dtos.JWTToken) {
	oldTokenStruct := dtos.IMSPayload{Token: oldToken}
	jsonPayload, err := json.Marshal(oldTokenStruct)
	resp, err := http.Post(setting.IMSJWTRefreshEP, "application/json; charset=utf-8", bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Errorf(500, "Error occurred while retrieving refreshed JWT from IMS", err)
	}
	defer resp.Body.Close()
	bodyBytes, _ := ioutil.ReadAll(resp.Body)
	var tokenStruct dtos.JWTToken

	json.Unmarshal(bodyBytes, &tokenStruct)
	fmt.Printf("%+v", tokenStruct)

	token, _, err := new(jwt.Parser).ParseUnverified(tokenStruct.Token, jwt.MapClaims{})
	if err != nil {
		log.Errorf(500, "Error occurred while decoding refreshed JWT token", err)
	}
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		expHeader := claims["exp"]
		tokenExp := fmt.Sprintf("%.0f", expHeader)
		tokenStruct.Expiry = tokenExp
	}
	return tokenStruct
}
