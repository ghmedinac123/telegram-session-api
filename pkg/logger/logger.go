package logger

import (
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

var Log zerolog.Logger

func Init(level string) {
	lvl := parseLevel(level)
	env := os.Getenv("API_ENV")

	// Formato del caller: [archivo:linea]
	zerolog.CallerMarshalFunc = func(pc uintptr, file string, line int) string {
		return filepath.Base(file) + ":" + itoa(line)
	}

	if env == "production" {
		Log = zerolog.New(os.Stdout).Level(lvl).With().Timestamp().Caller().Logger()
	} else {
		Log = zerolog.New(zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}).Level(lvl).With().Timestamp().Caller().Logger()
	}
}

func itoa(i int) string {
	if i < 10 {
		return string(rune('0' + i))
	}
	return itoa(i/10) + string(rune('0'+i%10))
}

func parseLevel(level string) zerolog.Level {
	switch strings.ToLower(level) {
	case "debug":
		return zerolog.DebugLevel
	case "info":
		return zerolog.InfoLevel
	case "warn", "warning":
		return zerolog.WarnLevel
	case "error":
		return zerolog.ErrorLevel
	case "fatal":
		return zerolog.FatalLevel
	default:
		return zerolog.InfoLevel
	}
}

func Debug() *zerolog.Event { return Log.Debug() }
func Info() *zerolog.Event  { return Log.Info() }
func Warn() *zerolog.Event  { return Log.Warn() }
func Error() *zerolog.Event { return Log.Error() }
func Fatal() *zerolog.Event { return Log.Fatal() }