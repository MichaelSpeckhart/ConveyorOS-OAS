-- Your SQL goes here
-- Initial schema for conveyor-app

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_identifier VARCHAR NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    phone_number VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    full_invoice_number VARCHAR NOT NULL,
    display_invoice_number VARCHAR NOT NULL,
    number_of_items INT NOT NULL,
    customer_identifier VARCHAR NOT NULL,
    customer_first_name VARCHAR NOT NULL,
    customer_last_name VARCHAR NOT NULL,
    customer_phone_number VARCHAR NOT NULL,
    invoice_dropoff_date TIMESTAMP NOT NULL,
    invoice_pickup_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL,
    pin VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS garments (
    id SERIAL PRIMARY KEY,
    full_invoice_number VARCHAR NOT NULL,
    display_invoice_number VARCHAR NOT NULL,
    item_id VARCHAR NOT NULL,
    item_description VARCHAR NOT NULL,
    invoice_dropoff_date TIMESTAMP NOT NULL,
    invoice_pickup_date TIMESTAMP NOT NULL,
    invoice_comments TEXT NOT NULL,
    slot_number INT NOT NULL
);
