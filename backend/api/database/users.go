package database

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func generateAPIKey() (string, error) {
    bytes := make([]byte, 32)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(bytes), nil
}

func (db *DB) CreateUser(username, password string) (*User, error) {
    // Hash password
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    // Generate API key
    apiKey, err := generateAPIKey()
    if err != nil {
        return nil, err
    }

    // Insert user
    result, err := db.Exec(
        `INSERT INTO users (username, password_hash, api_key) VALUES (?, ?, ?)`,
        username, string(hash), apiKey,
    )
    if err != nil {
        return nil, err
    }

    id, err := result.LastInsertId()
    if err != nil {
        return nil, err
    }

    return &User{
        ID:        id,
        Username:  username,
        APIKey:    apiKey,
        CreatedAt: time.Now(),
    }, nil
}

func (db *DB) GetUserByAPIKey(apiKey string) (*User, error) {
    var user User
    var lastLogin sql.NullTime

    err := db.QueryRow(
        `SELECT id, username, api_key, created_at, last_login FROM users WHERE api_key = ?`,
        apiKey,
    ).Scan(&user.ID, &user.Username, &user.APIKey, &user.CreatedAt, &lastLogin)

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    if lastLogin.Valid {
        user.LastLogin = &lastLogin.Time
    }

    return &user, nil
}

func (db *DB) AuthenticateUser(username, password string) (*User, error) {
    var user User
    var passwordHash string
    var lastLogin sql.NullTime

    err := db.QueryRow(
        `SELECT id, username, password_hash, api_key, created_at, last_login FROM users WHERE username = ?`,
        username,
    ).Scan(&user.ID, &user.Username, &passwordHash, &user.APIKey, &user.CreatedAt, &lastLogin)

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
        return nil, nil
    }

    if lastLogin.Valid {
        user.LastLogin = &lastLogin.Time
    }

    // Update last login time
    now := time.Now()
    _, err = db.Exec(
        `UPDATE users SET last_login = ? WHERE id = ?`,
        now, user.ID,
    )
    if err != nil {
        return nil, err
    }

    user.LastLogin = &now
    return &user, nil
}

func (db *DB) UpdateUserAPIKey(userID int64) (string, error) {
    apiKey, err := generateAPIKey()
    if err != nil {
        return "", err
    }

    _, err = db.Exec(
        `UPDATE users SET api_key = ? WHERE id = ?`,
        apiKey, userID,
    )
    if err != nil {
        return "", err
    }

    return apiKey, nil
} 