-- Your SQL goes here
CREATE TABLE conveyoractivity (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR NOT NULL,
    full_invoice_number VARCHAR NOT NULL,
    slot_number INT NOT NULL,
    time_stamp TIMESTAMP NOT NULL DEFAULT NOW()
);