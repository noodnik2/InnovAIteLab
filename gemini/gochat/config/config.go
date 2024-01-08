package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Gemini struct {
		ApiKey string
	}
}

func Load() (cfg Config, errParse error) {
	viper.SetConfigName("config-local")
	viper.AddConfigPath("config")

	if errParse = viper.ReadInConfig(); errParse != nil {
		return
	}
	errParse = viper.Unmarshal(&cfg)
	return
}
