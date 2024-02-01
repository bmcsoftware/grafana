package models

type FTPConfig struct {
	Id          int64  `xorm:"id" json:"id"`
	OrgID       int64  `xorm:"org_id" json:"org_id"`
	Host        string `xorm:"ftp_host" json:"host"`
	Port        int    `xorm:"ftp_port" json:"port"`
	Username    string `xorm:"user_name" json:"username"`
	Password    string `xorm:"password" json:"password"`
	HasPassword bool   `xorm:"extends" json:"has_password"`
}

type SetFTPConfigCmd struct {
	OrgID    int64  `xorm:"org_id"`
	Host     string `xorm:"ftp_host" json:"host"`
	Port     int    `xorm:"ftp_port" json:"port"`
	Username string `xorm:"user_name" json:"username"`
	Password string `xorm:"password" json:"password"`
}

type ModifyFTPConfigCmd struct {
	Id       int64  `xorm:"id"`
	OrgID    int64  `xorm:"org_id"`
	Host     string `xorm:"ftp_host" json:"host"`
	Port     int    `xorm:"ftp_port" json:"port"`
	Username string `xorm:"user_name" json:"username"`
	Password string `xorm:"password" json:"password"`
}

type GetFTPConfig struct {
	OrgId  int64
	Result *FTPConfig
}
