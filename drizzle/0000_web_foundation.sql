CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,data TEXT NOT NULL,current_revision TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,data TEXT NOT NULL,locked_until INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS revisions(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,data TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL,stage TEXT NOT NULL,progress REAL,error TEXT,data TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS job_queue ON jobs(status,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS connections(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL,secret TEXT);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS usage(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,user_id TEXT NOT NULL,job_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,units INTEGER,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS locks(id TEXT PRIMARY KEY,owner TEXT NOT NULL,expires_at INTEGER NOT NULL);