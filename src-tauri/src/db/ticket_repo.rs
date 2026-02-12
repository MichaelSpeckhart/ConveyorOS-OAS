use diesel::prelude::*;

use crate::model::{NewTicket, Ticket, UpdateTicket};
use crate::schema::tickets;
use crate::schema::tickets::dsl::*;

pub fn count_tickets(conn: &mut PgConnection) -> QueryResult<i64> {
    tickets::table.count().get_result(conn)
}

pub fn create_ticket(conn: &mut PgConnection, new_ticket: NewTicket) -> Result<Ticket, String> {
    diesel::insert_into(tickets::table).values(new_ticket).get_result(conn).map_err(|_| "Error creating ticket".to_string())
}

pub fn ticket_exists(conn: &mut PgConnection, invoice_number: String) -> bool {
    tickets
        .filter(full_invoice_number.eq(invoice_number))
        .count()
        .get_result::<i64>(conn)
        .map(|count| count > 0)
        .unwrap_or(false)
}

pub fn get_ticket_by_invoice_number(conn: &mut PgConnection, invoice_number: &str) -> Result<Ticket, String> {
    tickets
        .filter(full_invoice_number.eq(invoice_number))
        .first::<Ticket>(conn)
        .map_err(|e| e.to_string())
}

pub fn get_customer_from_ticket(conn: &mut PgConnection, invoice_number: &str) -> Result<Option<crate::model::Customer>, String> {
    use crate::schema::customers::dsl as customers_dsl;
    use crate::schema::tickets::dsl as tickets_dsl;

    let result = tickets_dsl::tickets
        .inner_join(customers_dsl::customers.on(tickets_dsl::customer_identifier.eq(customers_dsl::customer_identifier)))
        .filter(tickets_dsl::full_invoice_number.eq(invoice_number))
        .select(customers_dsl::customers::all_columns())
        .first::<crate::model::Customer>(conn)
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub fn get_num_items_on_ticket(conn: &mut PgConnection, invoice_number: &str) -> Result<i32, String> {
    use crate::schema::tickets::dsl as tickets_dsl;

    let ticket = tickets_dsl::tickets
        .filter(tickets_dsl::full_invoice_number.eq(invoice_number))
        .first::<Ticket>(conn)
        .map_err(|e| e.to_string())?;

    Ok(ticket.number_of_items as i32)
}

pub fn update_ticket(conn: &mut PgConnection, ticket_id: i32, updated_ticket: &UpdateTicket) -> Result<Ticket, String> {
    use crate::schema::tickets::dsl as tickets_dsl;
    diesel::update(tickets_dsl::tickets.filter(tickets_dsl::id.eq(ticket_id)))
        .set(updated_ticket)
        .get_result::<Ticket>(conn)
        .map_err(|e| e.to_string())
}

pub fn update_ticket_item_count(conn: &mut PgConnection, invoice_number: &str, new_item_count: i32) -> Result<Ticket, String> {
    use crate::schema::tickets::dsl as tickets_dsl;
    diesel::update(tickets_dsl::tickets.filter(tickets_dsl::full_invoice_number.eq(invoice_number)))
        .set(number_of_items.eq(new_item_count))
        .get_result::<Ticket>(conn)
        .map_err(|e| e.to_string())
}

pub fn update_ticket_dropoff_pickup(conn: &mut PgConnection, invoice_number: &str, dropoff_date: chrono::NaiveDateTime, pickup_date: chrono::NaiveDateTime) -> Result<Ticket, String> {
    use crate::schema::tickets::dsl as tickets_dsl;
    diesel::update(tickets_dsl::tickets.filter(tickets_dsl::full_invoice_number.eq(invoice_number)))
        .set((
            invoice_dropoff_date.eq(dropoff_date),
            invoice_pickup_date.eq(pickup_date)
        ))
        .get_result::<Ticket>(conn)
        .map_err(|e| e.to_string())
}

pub fn update_ticket_pickup_date(conn: &mut PgConnection, invoice_number: &str, pickup_date: chrono::NaiveDateTime) -> Result<Ticket, String> {
    use crate::schema::tickets::dsl as tickets_dsl;
    diesel::update(tickets_dsl::tickets.filter(tickets_dsl::full_invoice_number.eq(invoice_number)))
        .set(invoice_pickup_date.eq(pickup_date))
        .get_result::<Ticket>(conn)
        .map_err(|e| e.to_string())
}