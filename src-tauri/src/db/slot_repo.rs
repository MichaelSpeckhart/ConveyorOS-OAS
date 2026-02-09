// src/db/slot_repo.rs
use diesel::prelude::*;
use diesel::{OptionalExtension, PgConnection, QueryResult};

use crate::model::Slot;

pub struct SlotRepo;

impl SlotRepo {
    pub fn get(conn: &mut PgConnection, num: i32) -> QueryResult<Option<Slot>> {
        use crate::schema::slots::dsl::*;
        slots.filter(slot_number.eq(num)).first::<Slot>(conn).optional()
    }

    pub fn list_all(conn: &mut PgConnection) -> QueryResult<Vec<Slot>> {
        use crate::schema::slots::dsl::*;
        slots.order(slot_number.asc()).load::<Slot>(conn)
    }

    pub fn find_first_empty(conn: &mut PgConnection) -> QueryResult<Option<Slot>> {
        use crate::schema::slots::dsl::*;
        slots
            .filter(slot_state.eq("empty"))
            .order(slot_number.asc())
            .first::<Slot>(conn)
            .optional()
    }

    pub fn find_ticket_slot(conn: &mut PgConnection, ticket: &str) -> QueryResult<Option<Slot>> {
        use crate::schema::slots::dsl::*;
        slots
            .filter(assigned_ticket.eq(ticket))
            .order(slot_number.asc())
            .first::<Slot>(conn)
            .optional()
    }

    pub fn ticket_on_conveyor(conn: &mut PgConnection, ticket: &str) -> QueryResult<bool> {
        use crate::schema::slots::dsl::*;
        let count: i64 = slots
            .filter(assigned_ticket.eq(ticket))
            .count()
            .get_result(conn)?;
        Ok(count > 0)
    }

    pub fn free_slot(
        conn: &mut PgConnection,
        slot_number_val: i32,
    ) -> QueryResult<()> {
        use crate::schema::slots::dsl::*;

        diesel::update(slots.filter(slot_number.eq(slot_number_val)))
            .set((
                slot_state.eq("empty"),
                assigned_ticket.eq::<Option<String>>(None),
                item_id.eq::<Option<String>>(None),
                updated_at.eq(diesel::dsl::now),
            ))
            .execute(conn)?;

        Ok(())
    }

    /// Atomic reservation: only reserves if currently empty.
    /// Returns true if reservation succeeded, false if someone else got it.
    pub fn try_reserve(
        conn: &mut PgConnection,
        num: i32,
        ticket: Option<&str>,
    ) -> QueryResult<bool> {
        use crate::schema::slots::dsl::*;

        let rows = diesel::update(
            slots
                .filter(slot_number.eq(num))
                .filter(slot_state.eq("empty")),
        )
        .set((
            slot_state.eq("reserved"),
            assigned_ticket.eq(ticket.map(|s| s.to_string())),
            updated_at.eq(diesel::dsl::now),
        ))
        .execute(conn)?;

        Ok(rows == 1)
    }

    /// Mark reserved -> occupied (or empty -> occupied if you want)
    pub fn set_occupied(
        conn: &mut PgConnection,
        num: i32,
        ticket: Option<&str>,
    ) -> QueryResult<()> {
        use crate::schema::slots::dsl::*;

        diesel::update(slots.filter(slot_number.eq(num)))
            .set((
                slot_state.eq("occupied"),
                assigned_ticket.eq(ticket.map(|s| s.to_string())),
                updated_at.eq(diesel::dsl::now),
            ))
            .execute(conn)?;

        Ok(())
    }

    pub fn clear(conn: &mut PgConnection, num: i32) -> QueryResult<()> {
        use crate::schema::slots::dsl::*;

        diesel::update(slots.filter(slot_number.eq(num)))
            .set((
                slot_state.eq("empty"),
                assigned_ticket.eq::<Option<String>>(None),
                item_id.eq::<Option<String>>(None),
                updated_at.eq(diesel::dsl::now),
            ))
            .execute(conn)?;

        Ok(())
    }

    pub fn set_blocked(conn: &mut PgConnection, num: i32) -> QueryResult<()> {
        use crate::schema::slots::dsl::*;
        diesel::update(slots.filter(slot_number.eq(num)))
            .set((slot_state.eq("blocked"), updated_at.eq(diesel::dsl::now)))
            .execute(conn)?;
        Ok(())
    }
}
