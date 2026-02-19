-- Your SQL goes here
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS ticket_status VARCHAR NOT NULL DEFAULT 'Not Processed';