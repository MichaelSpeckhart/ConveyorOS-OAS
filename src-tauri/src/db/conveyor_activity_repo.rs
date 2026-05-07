use diesel::prelude::*;
use diesel::{PgConnection, QueryResult};

use crate::model::{ConveyorActivity, NewConveyorActivity};
use crate::schema::{conveyoractivity};
use crate::schema::conveyoractivity::dsl::*;


pub fn create_activity(conn: &mut PgConnection, new_activity: NewConveyorActivity) -> QueryResult<ConveyorActivity> {
    diesel::insert_into(conveyoractivity::table)
        .values(new_activity)
        .get_result(conn)
}

pub fn get_all_conveyor_activity(conn: &mut PgConnection) -> QueryResult<Vec<ConveyorActivity>> {
    conveyoractivity.load::<ConveyorActivity>(conn)
}

