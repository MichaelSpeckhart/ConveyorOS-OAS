-- Your SQL goes here
ALTER TABLE sessions
ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;