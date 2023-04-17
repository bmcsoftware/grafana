package miscellaneous

type PARAM struct {
	Type  string      `json:"type"`
	Value interface{} `json:"value"`
}

type UPSERTDTO struct {
	Opertaion         string           `json:"opertaion"`
	Table             string           `json:"table"`
	PrimaryParameters map[string]PARAM `json:"primaryParameters"`
	Parameters        map[string]PARAM `json:"parameters"`
}
