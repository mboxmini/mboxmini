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
		Port:           "8080",
		ContainerName:  "mboxmini-server",
		DockerImage:    "itzg/minecraft-server:latest",
		DataVolumePath: "/data",
	}
}
