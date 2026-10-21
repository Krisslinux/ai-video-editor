import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {dataDir} from './config.ts';
export const db=new DatabaseSync(path.join(dataDir,'frameflow.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,data TEXT NOT NULL,current_revision TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,data TEXT NOT NULL,locked_until INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS revisions(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,data TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL,stage TEXT NOT NULL,progress REAL,error TEXT,data TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS job_queue ON jobs(status,created_at);
CREATE TABLE IF NOT EXISTS connections(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL,secret TEXT);
CREATE TABLE IF NOT EXISTS usage(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,user_id TEXT NOT NULL,job_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,units INTEGER,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS locks(id TEXT PRIMARY KEY,owner TEXT NOT NULL,expires_at INTEGER NOT NULL);
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

INSERT OR IGNORE INTO migrations VALUES(1,unixepoch()*1000);
INSERT OR IGNORE INTO migrations VALUES(2,unixepoch()*1000);`);
export const one=(sql:string,...args:any[])=>db.prepare(sql).get(...args) as Record<string,any>|undefined;
export const all=(sql:string,...args:any[])=>db.prepare(sql).all(...args) as Record<string,any>[];
export const run=(sql:string,...args:any[])=>db.prepare(sql).run(...args);
export function transaction<T>(fn:()=>T):T{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
export const json=<T>(row:Record<string,any>|undefined):T|undefined=>row?JSON.parse(row.data):undefined;
