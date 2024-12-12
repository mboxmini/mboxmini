package database

import (
	"database/sql"
	"encoding/json"
	"time"
)

func (db *DB) SetSetting(key string, value interface{}) error {
    // Convert value to JSON string
    jsonValue, err := json.Marshal(value)
    if err != nil {
        return err
    }

    _, err = db.Exec(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
    `, key, string(jsonValue), time.Now())

    return err
}

func (db *DB) GetSetting(key string) (*Setting, error) {
    var setting Setting
    err := db.QueryRow(`
        SELECT key, value, updated_at
        FROM settings
        WHERE key = ?
    `, key).Scan(&setting.Key, &setting.Value, &setting.UpdatedAt)

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    return &setting, nil
}

func (db *DB) GetSettingValue(key string, defaultValue interface{}) (interface{}, error) {
    setting, err := db.GetSetting(key)
    if err != nil {
        return nil, err
    }

    if setting == nil {
        return defaultValue, nil
    }

    var value interface{}
    if err := json.Unmarshal([]byte(setting.Value), &value); err != nil {
        return nil, err
    }

    return value, nil
}

func (db *DB) DeleteSetting(key string) error {
    _, err := db.Exec(`DELETE FROM settings WHERE key = ?`, key)
    return err
}

// Helper functions for common settings

func (db *DB) SetMaxServersPerUser(count int) error {
    return db.SetSetting("max_servers_per_user", count)
}

func (db *DB) GetMaxServersPerUser(defaultValue int) (int, error) {
    value, err := db.GetSettingValue("max_servers_per_user", defaultValue)
    if err != nil {
        return defaultValue, err
    }

    // Convert from float64 (JSON number) to int
    if num, ok := value.(float64); ok {
        return int(num), nil
    }
    return defaultValue, nil
}

func (db *DB) SetDefaultMemory(memory string) error {
    return db.SetSetting("default_memory", memory)
}

func (db *DB) GetDefaultMemory(defaultValue string) (string, error) {
    value, err := db.GetSettingValue("default_memory", defaultValue)
    if err != nil {
        return defaultValue, err
    }

    if str, ok := value.(string); ok {
        return str, nil
    }
    return defaultValue, nil
} 