-- Your SQL goes here
ALTER TABLE app_state
ADD COLUMN IF NOT EXISTS num_items_on_conveyor INTEGER NOT NULL DEFAULT 0;