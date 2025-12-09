// @generated automatically by Diesel CLI.

diesel::table! {
    customers (id) {
        id -> Int4,
        customer_identifier -> Varchar,
        first_name -> Varchar,
        last_name -> Varchar,
        phone_number -> Varchar,
        created_at -> Timestamp,
    }
}

diesel::table! {
    garments (id) {
        id -> Int4,
        full_invoice_number -> Varchar,
        display_invoice_number -> Varchar,
        item_id -> Varchar,
        item_description -> Varchar,
        invoice_dropoff_date -> Timestamp,
        invoice_pickup_date -> Timestamp,
        invoice_comments -> Text,
        slot_number -> Int4,
    }
}

diesel::table! {
    tickets (id) {
        id -> Int4,
        full_invoice_number -> Varchar,
        display_invoice_number -> Varchar,
        number_of_items -> Int4,
        customer_identifier -> Varchar,
        customer_first_name -> Varchar,
        customer_last_name -> Varchar,
        customer_phone_number -> Varchar,
        invoice_dropoff_date -> Timestamp,
        invoice_pickup_date -> Timestamp,
        created_at -> Timestamp,
    }
}

diesel::table! {
    users (id) {
        id -> Int4,
        username -> Varchar,
        pin -> Varchar,
        created_at -> Timestamp,
    }
}

diesel::allow_tables_to_appear_in_same_query!(customers, garments, tickets, users,);
