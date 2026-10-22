CREATE TABLE IF NOT EXISTS lyric_credentials (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL,
 secret TEXT NOT NULL,
 PRIMARY KEY(user_id, provider)
);
