use diesel::prelude::*;
use chrono::{DateTime, NaiveDate};

use crate::model::{NewSession, Session};
use crate::schema::sessions;
use crate::schema::sessions::dsl::*;

pub fn close_active_sessions_for_user(conn: &mut PgConnection, user_id_val: i32) -> QueryResult<usize> {
    diesel::update(sessions.filter(user_id.eq(user_id_val)).filter(logout_at.is_null()))
        .set(logout_at.eq(diesel::dsl::now))
        .execute(conn)
}

pub fn create_session(conn: &mut PgConnection, user_id_val: i32) -> QueryResult<Session> {
    let new_session = NewSession { user_id: user_id_val };
    diesel::insert_into(sessions::table)
        .values(new_session)
        .get_result(conn)
}

pub fn end_session(conn: &mut PgConnection, session_id: i32) -> QueryResult<Session> {
    diesel::update(sessions.filter(id.eq(session_id)))
        .set(logout_at.eq(diesel::dsl::now))
        .get_result(conn)
}

pub fn increment_garments(conn: &mut PgConnection, session_id: i32) -> QueryResult<Session> {
    diesel::update(sessions.filter(id.eq(session_id)))
        .set(garments_scanned.eq(garments_scanned + 1))
        .get_result(conn)
}

pub fn increment_tickets(conn: &mut PgConnection, session_id: i32) -> QueryResult<Session> {
    diesel::update(sessions.filter(id.eq(session_id)))
        .set(tickets_completed.eq(tickets_completed + 1))
        .get_result(conn)
}

pub fn get_weekly_stats(conn: &mut PgConnection) -> QueryResult<Vec<(i32, i64)>> {
    use diesel::dsl::sql;
    use diesel::sql_types::{Integer, BigInt};

    sessions
        .select((
            sql::<Integer>("EXTRACT(WEEK FROM login_at) AS week_number"),
            sql::<BigInt>("SUM(garments_scanned) AS total_garments"),
        ))
        .group_by(sql::<Integer>("week_number"))
        .load::<(i32, i64)>(conn)
}

pub fn get_sessions_start_end(conn: &mut PgConnection, start_date: NaiveDate, end_date: NaiveDate) -> QueryResult<Vec<Session>> {
    use diesel::dsl::sql;
    use diesel::sql_types::{Date};

    sessions
        .filter(sql::<Date>("DATE(login_at)").ge(start_date))
        .filter(sql::<Date>("DATE(login_at)").le(end_date))
        .load::<Session>(conn)
}

pub fn session_exists_today(conn: &mut PgConnection, user_id_val: i32) -> QueryResult<bool> {
    use diesel::dsl::sql;
    use diesel::sql_types::Date;
    let today = chrono::Local::now().date_naive();

    let count: i64 = sessions
        .filter(user_id.eq(user_id_val))
        .filter(sql::<Date>("DATE(login_at)").eq(today))
        .count()
        .get_result(conn)?;

    Ok(count > 0)
}

pub fn get_existing_session_today(conn: &mut PgConnection, user_id_val: i32) -> QueryResult<Option<Session>> {
    use diesel::dsl::sql;
    use diesel::sql_types::Date;
    let today = chrono::Local::now().date_naive();

    sessions
        .filter(user_id.eq(user_id_val))
        .filter(sql::<Date>("DATE(login_at)").eq(today))
        .first::<Session>(conn)
        .optional()
}
