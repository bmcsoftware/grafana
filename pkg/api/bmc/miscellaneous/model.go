package miscellaneous

type PARAM struct {
	Type  string      `json:"type"`
	Value interface{} `json:"value"`
}

type UPSERTDTO struct {
	Operation         string           `json:"operation"`
	Table             string           `json:"table"`
	PrimaryParameters map[string]PARAM `json:"primaryParameters"`
	Parameters        map[string]PARAM `json:"parameters"`
}
