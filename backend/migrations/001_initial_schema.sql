-- users: from Google OAuth
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- auth_sessions: session tokens
CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);

-- halls
CREATE TABLE IF NOT EXISTS halls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- hall_members: user + role + points per hall
CREATE TABLE IF NOT EXISTS hall_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hall_id INTEGER NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    points REAL NOT NULL DEFAULT 0,
    joined_at DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE(hall_id, user_id)
);

CREATE INDEX idx_hall_members_hall ON hall_members(hall_id);
CREATE INDEX idx_hall_members_user ON hall_members(user_id);

-- hall_invites
CREATE TABLE IF NOT EXISTS hall_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hall_id INTEGER NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE(hall_id, user_id)
);

CREATE INDEX idx_hall_invites_hall ON hall_invites(hall_id);
CREATE INDEX idx_hall_invites_user ON hall_invites(user_id);

-- games
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hall_id INTEGER NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    point_conversion_rate REAL NOT NULL DEFAULT 1.0,
    expected_sum_rule TEXT CHECK (expected_sum_rule IN ('zero', 'fixed', 'custom') OR expected_sum_rule IS NULL),
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_games_hall ON games(hall_id);

-- game_sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name TEXT,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    finalized_at DATETIME
);

CREATE INDEX idx_game_sessions_game ON game_sessions(game_id);

-- session_results: points per user in game units
CREATE TABLE IF NOT EXISTS session_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points REAL NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_results_session ON session_results(session_id);
