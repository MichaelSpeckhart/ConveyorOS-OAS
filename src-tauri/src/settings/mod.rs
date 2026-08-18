pub mod appsettings;

use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

use crate::settings::appsettings::AppSettings;

/// Reads settings.json -> key "app_settings" (written by the frontend)
pub fn load_settings(app: &AppHandle) -> AppSettings {
    let _path = app
        .path()
        .app_data_dir()
        .expect("app_data_dir")
        .join("settings.json");

    // 👇 this uses the SAME store resolution as the frontend
    let store = app.store("settings.json").expect("store");

    // store.get returns serde_json::Value
    let Some(value) = store.get("app_settings") else {
        println!("⚠️ No app_settings found in store, using defaults");
        return AppSettings::default();
    };

    let mut settings = serde_json::from_value::<AppSettings>(value).unwrap_or_else(|e| {
        eprintln!("⚠️ Failed to parse app_settings from store: {e}");
        AppSettings::default()
    });

    settings.numFrames = u32::try_from(settings.frames.len()).unwrap_or(u32::MAX);
    settings.slotsPerFrame = settings
        .frames
        .first()
        .map(|frame| u32::try_from(frame.slots.len()).unwrap_or(u32::MAX))
        .unwrap_or(0);

    settings
}

/// Convenience helper: build Postgres DATABASE_URL from saved settings
pub fn database_url(s: &AppSettings) -> String {
    let pw = urlencoding::encode(&s.dbPassword);
    format!(
        "postgres://{}:{}@{}:{}/{}",
        s.dbUser, pw, s.dbHost, s.dbPort, s.dbName
    )
}

pub fn pos_csv_dir(s: &AppSettings) -> String {
    s.posCsvDir.clone()
}
