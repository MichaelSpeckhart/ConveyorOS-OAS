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

            
            let last = AppStateRepo::get_last_used_slot(conn)?; 

            
            let empties = Self::list_empty_slots(conn)?;

            
            let chosen = Self::pick_after(&empties, last)
                .ok_or(diesel::result::Error::NotFound)?;

            
            for _ in 0..10 {
                let ok = SlotRepo::try_reserve(conn, chosen, ticket)?;
                if ok {
                    
                    AppStateRepo::set_last_used_slot(conn, chosen)?;
                    return Ok(chosen);
                }

                
                let empties = Self::list_empty_slots(conn)?;
                let next = Self::pick_after(&empties, chosen)
                    .ok_or(diesel::result::Error::NotFound)?;

                let ok2 = SlotRepo::try_reserve(conn, next, ticket)?;
                if ok2 {
                    AppStateRepo::set_last_used_slot(conn, next)?;
                    return Ok(next);
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

    fn pick_after(empties: &[Slot], last: i32) -> Option<i32> {
        if empties.is_empty() {
            return None;
        }
        
        empties
            .iter()
            .find(|s| s.slot_number > last)
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

    pub fn get_total_slots(
        conn: &mut PgConnection,
    ) -> diesel::QueryResult<i64> {
        use crate::schema::slots::dsl::*;
        slots
            .count()
            .get_result::<i64>(conn)
    }
}
