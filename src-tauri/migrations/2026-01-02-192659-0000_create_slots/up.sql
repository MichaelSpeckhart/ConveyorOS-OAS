CREATE TABLE IF NOT EXISTS slots (
  slot_number     INTEGER PRIMARY KEY,
  slot_state      VARCHAR NOT NULL DEFAULT 'empty',
  assigned_ticket VARCHAR NULL,
  item_id         VARCHAR NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_state ON slots(slot_state);
CREATE INDEX IF NOT EXISTS idx_slots_ticket ON slots(assigned_ticket);
