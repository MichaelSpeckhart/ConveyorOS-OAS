use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;

use crate::model::{Ticket, NewTicket};
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

