use diesel::prelude::*;
use diesel::{PgConnection, QueryResult};

use crate::model::{ConveyorActivity, NewConveyorActivity};
use crate::schema::{conveyoractivity};


pub fn create_activity(conn: &mut PgConnection, new_activity: NewConveyorActivity) -> QueryResult<ConveyorActivity> {
    diesel::insert_into(conveyoractivity::table)
        .values(new_activity)
        .get_result(conn)
}

