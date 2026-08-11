use diesel::prelude::*;

use crate::model::{NewTicketDetails, TicketDetails};
use crate::schema::ticket_details;
use crate::schema::ticket_details::dsl::*;

pub fn upsert_ticket_details(
    conn: &mut PgConnection,
    new_details: NewTicketDetails,
) -> QueryResult<TicketDetails> {
    diesel::insert_into(ticket_details::table)
        .values(&new_details)
        .on_conflict(full_invoice_number)
        .do_update()
        .set(&new_details)
        .get_result(conn)
}

pub fn get_ticket_details(
    conn: &mut PgConnection,
    for_invoice_number: &str,
) -> QueryResult<Option<TicketDetails>> {
    ticket_details
        .filter(full_invoice_number.eq(for_invoice_number))
        .first::<TicketDetails>(conn)
        .optional()
}
