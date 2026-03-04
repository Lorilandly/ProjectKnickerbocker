-- Align schema with updated plan:
-- - remove session-based tables usage
-- - add played_at on games
-- - add game_results
-- - add hall_chip_records

ALTER TABLE games ADD COLUMN played_at DATETIME NOT NULL DEFAULT (datetime('now'));

CREATE TABLE IF NOT EXISTS game_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points REAL NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE(game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_results_game ON game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user ON game_results(user_id);

CREATE TABLE IF NOT EXISTS hall_chip_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hall_id INTEGER NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    recorded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    note TEXT,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    CHECK(amount != 0)
);

CREATE INDEX IF NOT EXISTS idx_chip_records_hall ON hall_chip_records(hall_id);
CREATE INDEX IF NOT EXISTS idx_chip_records_user ON hall_chip_records(user_id);
