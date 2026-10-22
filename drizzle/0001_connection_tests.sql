CREATE TABLE IF NOT EXISTS connection_tests (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 revision TEXT NOT NULL,
 status TEXT NOT NULL,
 data TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS connection_tests_user ON connection_tests(user_id, created_at);
