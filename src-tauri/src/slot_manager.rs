use diesel::prelude::*;
use serde::Serialize;
use crate::db::{slot_repo::SlotRepo, app_state_repo::AppStateRepo};
use crate::model::Slot;


#[derive(Serialize)]
pub struct SlotManagerStats {
    pub occupied_slots: i64,
    pub total_slots: i64,
    pub occupancy_percentage: f64,
}

impl SlotManagerStats {
    pub fn fetch(conn: &mut PgConnection) -> diesel::QueryResult<Self> {
        let occupied = SlotManager::get_number_occupied_slots(conn)?;
        let total = SlotManager::get_total_slots(conn)?;

        let occupancy_percentage = if total > 0 {
            (occupied as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        Ok(SlotManagerStats {
            occupied_slots: occupied,
            total_slots: total,
            occupancy_percentage,
        })
    }
}


pub struct SlotManager;

impl SlotManager {

    pub fn reserve_next_slot(
        conn: &mut PgConnection,
        ticket: Option<&str>,
    ) -> Result<i32, String> {
        conn.transaction::<i32, diesel::result::Error, _>(|conn| {

            if let Some(t) = ticket {
                if let Some(existing) = SlotRepo::find_ticket_slot(conn, t)? {
                    if existing.slot_state != "blocked" && existing.slot_state != "error" {
                        return Ok(existing.slot_number);
                    }
                }
            }

            let empties = Self::list_empty_slots(conn)?;
            let occupied = Self::list_occupied_slot_numbers(conn)?;

            let chosen = Self::pick_spread(&empties, &occupied)
                .ok_or(diesel::result::Error::NotFound)?;

            for _ in 0..10 {
                if SlotRepo::try_reserve(conn, chosen, ticket)? {
                    AppStateRepo::set_last_used_slot(conn, chosen)?;
                    return Ok(chosen);
                }

                // Slot was taken concurrently; re-query and spread-pick again.
                let empties = Self::list_empty_slots(conn)?;
                let occupied = Self::list_occupied_slot_numbers(conn)?;
                if let Some(next) = Self::pick_spread(&empties, &occupied) {
                    if SlotRepo::try_reserve(conn, next, ticket)? {
                        AppStateRepo::set_last_used_slot(conn, next)?;
                        return Ok(next);
                    }
                }
            }

            Err(diesel::result::Error::NotFound)
        })
        .map_err(|e| format!("No available slots: {e}"))
    }


    pub fn free_slot(
        conn: &mut PgConnection,
        slot_number: i32,
    ) -> diesel::QueryResult<()> {

        SlotRepo::free_slot(conn, slot_number)
    }

    fn list_empty_slots(conn: &mut PgConnection) -> diesel::QueryResult<Vec<Slot>> {
        use crate::schema::slots::dsl::*;
        slots
            .filter(slot_state.eq("empty"))
            .order(slot_number.asc())
            .load::<Slot>(conn)
    }

    fn list_occupied_slot_numbers(conn: &mut PgConnection) -> diesel::QueryResult<Vec<i32>> {
        use crate::schema::slots::dsl::*;
        slots
            .filter(slot_state.ne("empty"))
            .select(slot_number)
            .order(slot_number.asc())
            .load::<i32>(conn)
    }

    fn pick_spread(empties: &[Slot], occupied: &[i32]) -> Option<i32> {
        if empties.is_empty() {
            return None;
        }

        let total = empties.len() + occupied.len();
        let capacity_pct = if total > 0 {
            (occupied.len() as f64 / total as f64) * 100.0
        } else {
            0.0
        };

        // ≥ 50% full: just take the next available slot linearly.
        if capacity_pct >= 50.0 {
            return empties.first().map(|s| s.slot_number);
        }

        // < 50% full: find the first empty slot that is at least 5 away from
        // every currently occupied slot.
        if occupied.is_empty() {
            return empties.first().map(|s| s.slot_number);
        }

        let candidate = empties.iter().find(|s| {
            occupied.iter().all(|&o| (s.slot_number - o).abs() >= 5)
        });

        // Fall back to first available if no 5-apart slot exists.
        candidate
            .or_else(|| empties.first())
            .map(|s| s.slot_number)
    }

    pub fn get_number_occupied_slots(
        conn: &mut PgConnection,
    ) -> diesel::QueryResult<i64> {
        use crate::schema::slots::dsl::*;
        slots
            .filter(slot_state.ne("empty"))
            .count()
            .get_result::<i64>(conn)
    }

    pub fn get_occupied_slots(
        conn: &mut PgConnection,
    ) -> diesel::QueryResult<Vec<Slot>> {
        use crate::schema::slots::dsl::*;
        slots
            .filter(slot_state.ne("empty"))
            .order(slot_number.asc())
            .load::<Slot>(conn)
    }

    pub fn get_total_slots(
        conn: &mut PgConnection,
    ) -> diesel::QueryResult<i64> {
        use crate::schema::slots::dsl::*;
        slots
            .count()
            .get_result::<i64>(conn)
    }
}
