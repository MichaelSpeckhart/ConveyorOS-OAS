-- Your SQL goes here
ALTER TABLE tickets
ADD COLUMN ticket_status VARCHAR NOT NULL DEFAULT 'Not Processed';