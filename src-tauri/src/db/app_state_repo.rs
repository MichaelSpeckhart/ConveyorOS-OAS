use diesel::prelude::*;
use diesel::{PgConnection, QueryResult};

use crate::schema::app_state::dsl::*;

pub struct AppStateRepo;

impl AppStateRepo {
    pub fn get_last_used_slot(conn: &mut PgConnection) -> QueryResult<i32> {
        app_state
            .filter(id.eq(1))
            .select(last_used_slot)
            .first(conn)
    }

    pub fn set_last_used_slot(conn: &mut PgConnection, slot: i32) -> QueryResult<()> {
        diesel::update(app_state.filter(id.eq(1)))
            .set((
                last_used_slot.eq(slot),
                updated_at.eq(diesel::dsl::now),
            ))
            .execute(conn)?;
        Ok(())
    }
}
