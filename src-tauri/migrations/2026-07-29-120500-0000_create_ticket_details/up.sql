-- Your SQL goes here
CREATE TABLE IF NOT EXISTS ticket_details (
    id SERIAL PRIMARY KEY,
    full_invoice_number VARCHAR NOT NULL UNIQUE,
    pos_source VARCHAR NOT NULL,
    plant VARCHAR,
    route VARCHAR,
    store VARCHAR,
    transaction_date VARCHAR,
    transaction_time VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
