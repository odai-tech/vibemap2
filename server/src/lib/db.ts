import fs from 'node:fs';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { config } from '../config.ts';

fs.mkdirSync(config.dataDir, { recursive: true });

export const db = new DatabaseSync(config.dbFile);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 3000;

  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    email        TEXT NOT NULL UNIQUE,
    handle       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name         TEXT NOT NULL,
    pass         TEXT NOT NULL,
    bio          TEXT NOT NULL DEFAULT '',
    interests    TEXT NOT NULL DEFAULT '[]',
    verified     INTEGER NOT NULL DEFAULT 0,
    open_to_meet INTEGER NOT NULL DEFAULT 1,
    status_line  TEXT NOT NULL DEFAULT '',
    last_lat     REAL,
    last_lng     REAL,
    last_seen    INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS pins (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    category    TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags        TEXT NOT NULL DEFAULT '[]',
    author_id   TEXT NOT NULL REFERENCES users(id),
    created_at  INTEGER NOT NULL,
    starts_at   INTEGER,
    expires_at  INTEGER,
    capacity    INTEGER,
    cover       INTEGER NOT NULL DEFAULT 0,
    deleted     INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_pins_geo ON pins(lat, lng) WHERE deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_pins_author ON pins(author_id) WHERE deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_pins_expiry ON pins(expires_at) WHERE deleted = 0;

  CREATE TABLE IF NOT EXISTS pin_members (
    pin_id    TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (pin_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_pin_members_user ON pin_members(user_id);

  CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    pin_id     TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_pin ON messages(pin_id, created_at);

  -- Friendships stored once per pair with a < b (lexicographic).
  CREATE TABLE IF NOT EXISTS friendships (
    a            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    b            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending',
    requested_by TEXT NOT NULL,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    PRIMARY KEY (a, b)
  );
  CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(b);

  -- Direct messages, stored once per pair with a < b (lexicographic).
  CREATE TABLE IF NOT EXISTS dm_messages (
    id         TEXT PRIMARY KEY,
    a          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    b          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id  TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_dm_pair ON dm_messages(a, b, created_at);

  -- One row per conversation: inbox listing + unread counters without scanning messages.
  CREATE TABLE IF NOT EXISTS dm_threads (
    a           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    b           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_sender TEXT NOT NULL,
    last_body   TEXT NOT NULL DEFAULT '',
    last_at     INTEGER NOT NULL,
    unread_a    INTEGER NOT NULL DEFAULT 0,
    unread_b    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (a, b)
  );
  CREATE INDEX IF NOT EXISTS idx_dm_threads_a ON dm_threads(a, last_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dm_threads_b ON dm_threads(b, last_at DESC);

  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    actor_id   TEXT,
    pin_id     TEXT,
    body       TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
`);

const cache = new Map<string, StatementSync>();

/** Prepared-statement cache. */
export function q(sql: string): StatementSync {
  let stmt = cache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    cache.set(sql, stmt);
  }
  return stmt;
}

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
