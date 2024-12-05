package config

type Config struct {
	Port            string   `json:"port"`
	AllowedCommands []string `json:"allowedCommands"`
	DockerImage     string   `json:"dockerImage"`
	ContainerName   string   `json:"containerName"`
	DataVolumePath  string   `json:"dataVolumePath"`
	MaxMemory       string   `json:"maxMemory"`
}

func NewDefaultConfig() *Config {
	return &Config{
		Port: "8080",
		AllowedCommands: []string{
			"say",
			"kick",
			"op",
			"deop",
			"whitelist add",
			"whitelist remove",
			"list",
			"gamerule",
			"time set",
			"weather",
			"gamemode",
			"difficulty",
			"save-all",
			"stop",
			"tps",
			"ban",
			"ban-ip",
			"pardon",
			"pardon-ip",
		},
		DockerImage:    "itzg/minecraft-server",
		ContainerName:  "minecraft-server",
		DataVolumePath: "./minecraft-data",
		MaxMemory:      "2G",
	}
}
