use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;

use crate::establish_connection;
use crate::model::{Garment, NewGarment};
use crate::schema::garments;

pub fn count_garments(conn: &mut PgConnection) -> QueryResult<i64> {
    garments::table.count().get_result(conn)
}

pub fn garment_exists(conn: &mut PgConnection) -> bool {
    true
}

pub fn create_garment(conn: &mut PgConnection, new_garment: NewGarment) -> Result<Garment, String> {
    diesel::insert_into(garments::table).values(new_garment).get_result(conn).map_err(|_| "Error creating garment".to_string())
}



