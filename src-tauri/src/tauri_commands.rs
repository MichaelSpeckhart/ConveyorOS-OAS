use diesel::result::Error::NotFound;
use serde::Serialize;

use crate::{db::{connection::establish_connection, users_repo}, domain::auth, model::User};

#[derive(Serialize)]
pub struct login_result {
    pub username: String,
    pub id: i32
}

#[tauri::command]
pub fn auth_login_user_tauri(pin_input: String) -> Result<User, String> {
    // Validate PIN
    if pin_input.len() != 4 || !pin_input.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be 4 digits".into());
    }

    // Count users
    let num_users = auth::count_number_of_users()
        .map_err(|_| "Connection Error".to_string())?;

    // If no users exist, return special error
    if num_users == 0 {
        return Err("NO_USERS".into());  // frontend can special-case this
    }

    // Attempt login
    let user = auth::login_user_with_pin(&pin_input)?;

    Ok(user)
}

#[tauri::command]
pub fn auth_create_user_tauri(username_input: String, pin_input: String) -> Result<User, String> {
    // Validate username
    if username_input.trim().is_empty() {
        return Err("Username cannot be empty".into());
    }
    // Validate PIN
    if pin_input.len() != 4 || !pin_input.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must be 4 digits".into());
    }

    // Create user
    let new_user = auth::create_user(&username_input, &pin_input)
        .map_err(|_| "Connection Error".to_string())?;
    Ok(new_user)

}

#[tauri::command]
pub fn get_all_users_tauri() -> Result<Vec<User>, String> {
    let mut conn = establish_connection();

    users_repo::get_all_users(&mut conn).map_err(|_| "Connection Error".to_string())
}