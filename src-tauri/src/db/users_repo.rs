use diesel::prelude::*;

use crate::model::{User, NewUser};
use crate::schema::users::dsl::*;

pub fn count_users(conn: &mut PgConnection) -> QueryResult<i64> {
    users.count().get_result(conn)
}

pub fn find_by_pin(conn: &mut PgConnection, pint_input: &str) -> QueryResult<User> {
    users.filter(pin.eq(pint_input)).first::<User>(conn)
}

pub fn create_user(conn: &mut PgConnection, username_input: &str, pin_input: &str) -> QueryResult<User> {
    let new_user = NewUser {
        username: username_input.to_string(),
        pin: pin_input.to_string(),
        is_admin: 0
    };

    diesel::insert_into(users)
        .values(&new_user)
        .get_result(conn)
}

pub fn find_by_username(conn: &mut PgConnection, username_input: &str) -> QueryResult<User> {
    users.filter(username.eq(username_input)).first::<User>(conn)
}

pub fn get_all_users(conn: &mut PgConnection) -> QueryResult<Vec<User>> {
    users.load::<User>(conn)
}

pub fn get_user_by_id(conn: &mut PgConnection, user_id_val: i32) -> QueryResult<User> {
    users.filter(id.eq(user_id_val)).first::<User>(conn)
}