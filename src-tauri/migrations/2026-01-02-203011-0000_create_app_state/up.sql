-- Your SQL goes here
CREATE TABLE IF NOT EXISTS app_state (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  last_used_slot  INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ensure exactly one row exists (id=1)
INSERT INTO app_state (id, last_used_slot)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
