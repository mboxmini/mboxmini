package database

import (
	"database/sql"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

const schema = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    server_name TEXT NOT NULL,
    uptime INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 0,
    total_players INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_start DATETIME,
    last_stop DATETIME
);

CREATE TABLE IF NOT EXISTS player_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    join_time DATETIME NOT NULL,
    leave_time DATETIME,
    duration INTEGER DEFAULT 0
);
`

type DB struct {
    *sql.DB
}

func New(dbPath string) (*DB, error) {
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        return nil, err
    }

    if err := db.Ping(); err != nil {
        return nil, err
    }

    // Create tables
    if _, err := db.Exec(schema); err != nil {
        return nil, err
    }

    return &DB{db}, nil
}

type User struct {
    ID          int64
    Username    string
    APIKey      string
    CreatedAt   time.Time
    LastLogin   *time.Time
}

type Setting struct {
    Key       string
    Value     string
    UpdatedAt time.Time
}

type ServerStats struct {
    ID           int64
    ServerID     string
    ServerName   string
    Uptime       int64
    MaxPlayers   int
    TotalPlayers int
    CreatedAt    time.Time
    LastStart    *time.Time
    LastStop     *time.Time
}

type PlayerSession struct {
    ID         int64
    ServerID   string
    PlayerName string
    JoinTime   time.Time
    LeaveTime  *time.Time
    Duration   int64
} 