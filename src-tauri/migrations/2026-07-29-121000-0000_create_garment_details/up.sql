-- Your SQL goes here
CREATE TABLE IF NOT EXISTS garment_details (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR NOT NULL UNIQUE,
    pos_source VARCHAR NOT NULL,
    service_price VARCHAR,
    service_type VARCHAR,
    garment_color VARCHAR,
    transaction_date VARCHAR,
    transaction_time VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
