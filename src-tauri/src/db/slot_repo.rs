// src/db/slot_repo.rs
use diesel::prelude::*;
use diesel::{OptionalExtension, PgConnection, QueryResult};

use std::collections::HashSet;
use std::sync::RwLock;

use crate::model::Slot;

/// Slot numbers enabled by the current frame layout (set by apply_slot_settings).
/// `None` until settings have been applied, in which case every slot counts as active.
static ACTIVE_LAYOUT: RwLock<Option<HashSet<i32>>> = RwLock::new(None);

pub fn set_active_layout(enabled: HashSet<i32>) {
    *ACTIVE_LAYOUT.write().unwrap() = Some(enabled);
}

fn is_in_layout(num: i32) -> bool {
    ACTIVE_LAYOUT
        .read()
        .unwrap()
        .as_ref()
        .map_or(true, |enabled| enabled.contains(&num))
}

/// State a slot should return to once it no longer holds a garment.
fn freed_state(num: i32) -> &'static str {
    if is_in_layout(num) {
        "empty"
    } else {
        "blocked"
    }
}

pub struct SlotRepo;

impl SlotRepo {
    pub fn get(conn: &mut PgConnection, num: i32) -> QueryResult<Option<Slot>> {
        use crate::schema::slots::dsl::*;
        slots
            .filter(slot_number.eq(num))
            .first::<Slot>(conn)
            .optional()
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

    pub fn free_slot(conn: &mut PgConnection, slot_number_val: i32) -> QueryResult<()> {
        use crate::schema::slots::dsl::*;

        diesel::update(slots.filter(slot_number.eq(slot_number_val)))
            .set((
                slot_state.eq(freed_state(slot_number_val)),
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

    pub fn set_occupied_with_item(
        conn: &mut PgConnection,
        num: i32,
        ticket: Option<&str>,
        item: Option<&str>,
    ) -> QueryResult<()> {
        use crate::schema::slots::dsl::*;

        let rows = diesel::update(slots.filter(slot_number.eq(num)))
            .set((
                slot_state.eq("occupied"),
                assigned_ticket.eq(ticket.map(|s| s.to_string())),
                item_id.eq(item.map(|s| s.to_string())),
                updated_at.eq(diesel::dsl::now),
            ))
            .execute(conn)?;

        if rows == 1 {
            Ok(())
        } else {
            Err(diesel::result::Error::NotFound)
        }
    }

    pub fn clear(conn: &mut PgConnection, num: i32) -> QueryResult<()> {
        use crate::schema::slots::dsl::*;

        diesel::update(slots.filter(slot_number.eq(num)))
            .set((
                slot_state.eq(freed_state(num)),
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

    /// Re-blocks empty slots outside the active layout, e.g. after a bulk reset.
    pub fn block_outside_layout(conn: &mut PgConnection) -> QueryResult<()> {
        use crate::schema::slots::dsl::*;

        let Some(enabled) = ACTIVE_LAYOUT.read().unwrap().clone() else {
            return Ok(());
        };
        let enabled: Vec<i32> = enabled.into_iter().collect();
        diesel::update(
            slots
                .filter(slot_state.eq("empty"))
                .filter(slot_number.ne_all(enabled)),
        )
        .set((slot_state.eq("blocked"), updated_at.eq(diesel::dsl::now)))
        .execute(conn)?;
        Ok(())
    }

    /// Inserts any missing slots numbered 1..=count as empty.
    pub fn ensure_slots(conn: &mut PgConnection, count: i32) -> QueryResult<()> {
        if count < 1 {
            return Ok(());
        }
        diesel::sql_query(
            "INSERT INTO slots (slot_number, slot_state) \
             SELECT gs, 'empty' FROM generate_series(1, $1) AS gs \
             ON CONFLICT (slot_number) DO NOTHING",
        )
        .bind::<diesel::sql_types::Integer, _>(count)
        .execute(conn)?;
        Ok(())
    }
}
