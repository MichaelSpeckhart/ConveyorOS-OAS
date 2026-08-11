-- Your SQL goes here
CREATE TABLE IF NOT EXISTS customer_details (
    id SERIAL PRIMARY KEY,
    customer_identifier VARCHAR NOT NULL UNIQUE,
    pos_source VARCHAR NOT NULL,
    address_one VARCHAR,
    address_two VARCHAR,
    city VARCHAR,
    state VARCHAR,
    zip_code VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
