package database

import (
	"database/sql"
	"time"
)

func (db *DB) CreateOrUpdateServerStats(serverID, serverName string) error {
    _, err := db.Exec(`
        INSERT INTO server_stats (server_id, server_name)
        VALUES (?, ?)
        ON CONFLICT(server_id) DO UPDATE SET
            server_name = excluded.server_name
    `, serverID, serverName)
    return err
}

func (db *DB) RecordServerStart(serverID string) error {
    now := time.Now()
    _, err := db.Exec(`
        UPDATE server_stats 
        SET last_start = ?
        WHERE server_id = ?
    `, now, serverID)
    return err
}

func (db *DB) RecordServerStop(serverID string) error {
    now := time.Now()
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Get last start time
    var lastStart sql.NullTime
    err = tx.QueryRow(`
        SELECT last_start 
        FROM server_stats 
        WHERE server_id = ?
    `, serverID).Scan(&lastStart)
    if err != nil {
        return err
    }

    // Calculate and update uptime if we have a last start time
    if lastStart.Valid {
        uptime := now.Sub(lastStart.Time).Seconds()
        _, err = tx.Exec(`
            UPDATE server_stats 
            SET uptime = uptime + ?,
                last_stop = ?
            WHERE server_id = ?
        `, int64(uptime), now, serverID)
        if err != nil {
            return err
        }
    }

    return tx.Commit()
}

func (db *DB) RecordPlayerJoin(serverID, playerName string) error {
    now := time.Now()
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Update server stats
    _, err = tx.Exec(`
        UPDATE server_stats 
        SET total_players = total_players + 1,
            max_players = CASE 
                WHEN (
                    SELECT COUNT(*) 
                    FROM player_sessions 
                    WHERE server_id = ? AND leave_time IS NULL
                ) + 1 > max_players 
                THEN (
                    SELECT COUNT(*) 
                    FROM player_sessions 
                    WHERE server_id = ? AND leave_time IS NULL
                ) + 1
                ELSE max_players
            END
        WHERE server_id = ?
    `, serverID, serverID, serverID)
    if err != nil {
        return err
    }

    // Create player session
    _, err = tx.Exec(`
        INSERT INTO player_sessions (server_id, player_name, join_time)
        VALUES (?, ?, ?)
    `, serverID, playerName, now)
    if err != nil {
        return err
    }

    return tx.Commit()
}

func (db *DB) RecordPlayerLeave(serverID, playerName string) error {
    now := time.Now()
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Get the player's join time
    var joinTime time.Time
    err = tx.QueryRow(`
        SELECT join_time 
        FROM player_sessions 
        WHERE server_id = ? AND player_name = ? AND leave_time IS NULL
    `, serverID, playerName).Scan(&joinTime)
    if err != nil {
        return err
    }

    // Calculate session duration
    duration := now.Sub(joinTime).Seconds()

    // Update player session
    _, err = tx.Exec(`
        UPDATE player_sessions 
        SET leave_time = ?,
            duration = ?
        WHERE server_id = ? AND player_name = ? AND leave_time IS NULL
    `, now, int64(duration), serverID, playerName)
    if err != nil {
        return err
    }

    return tx.Commit()
}

func (db *DB) GetServerStats(serverID string) (*ServerStats, error) {
    var stats ServerStats
    var lastStart, lastStop sql.NullTime

    err := db.QueryRow(`
        SELECT id, server_id, server_name, uptime, max_players, total_players,
               created_at, last_start, last_stop
        FROM server_stats
        WHERE server_id = ?
    `, serverID).Scan(
        &stats.ID, &stats.ServerID, &stats.ServerName,
        &stats.Uptime, &stats.MaxPlayers, &stats.TotalPlayers,
        &stats.CreatedAt, &lastStart, &lastStop,
    )

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    if lastStart.Valid {
        stats.LastStart = &lastStart.Time
    }
    if lastStop.Valid {
        stats.LastStop = &lastStop.Time
    }

    return &stats, nil
} 