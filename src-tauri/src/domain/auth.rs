use diesel::prelude::*;

use crate::{db::{connection::establish_connection, users_repo}, model::User};


pub fn login_user_with_pin(pin_input: &str) -> Result<User, String> {
    if pin_input.len() != 4 || !pin_input.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be 4 digits".into());
    }

    let mut conn = establish_connection()?;

    users_repo::find_by_pin(&mut conn, pin_input).map_err(|_| "Invalid PIN".to_string())
}

pub fn count_number_of_users() -> Result<i64, String> {

    let mut conn: PgConnection = establish_connection()?;

    users_repo::count_users(&mut conn).map_err(|_| "Connection Exception".to_string())
}

pub fn create_user(username_input: &str, pin_input: &str) -> Result<User, String> {
    if username_input.trim().is_empty() {
        return Err("Username cannot be empty".into());
    }
    if pin_input.len() != 4 || !pin_input.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be 4 digits".into());
    }

    let mut conn = establish_connection().map_err(|_| "Connection Exception".to_string())?;

    let mut user = users_repo::find_by_username(&mut conn, username_input);
    match user {
        Ok(_) => return Err("Username already exists".into()),
        Err(diesel::result::Error::NotFound) => {},
        Err(e) => return Err(format!("DB error checking username: {}", e)),
    }

    user = users_repo::find_by_pin(&mut conn, pin_input);
    match user {
        Ok(_) => return Err("PIN already exists".into()),
        Err(diesel::result::Error::NotFound) => {},
        Err(e) => return Err(format!("DB error checking PIN: {}", e)),
    }

    users_repo::create_user(&mut conn, username_input, pin_input)
    .map_err(|e| format!("DB insert error: {}", e))
}

