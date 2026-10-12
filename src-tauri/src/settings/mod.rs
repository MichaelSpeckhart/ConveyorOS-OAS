pub mod appsettings;

use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

use crate::settings::appsettings::{AppSettings, FrameConfig};

// Keep in sync with MAX_NUM_FRAMES / LATCHES_PER_FRAME in src/lib/settings.tsx
pub const MAX_NUM_FRAMES: u32 = 20;
/// Every frame has 10 physical latches; 5-slot mode only enables the odd ones.
pub const LATCHES_PER_FRAME: usize = 10;

fn normalize_frames(settings: &mut AppSettings) {
    let first_frame = settings.frames.first();
    let legacy_enabled_count = first_frame
        .map(|frame| frame.slots.iter().filter(|enabled| **enabled).count())
        .unwrap_or(0);
    let stored_slots_per_frame: u32 = if first_frame
        .map(|frame| frame.slots.len() == 10 && legacy_enabled_count == 5)
        .unwrap_or(false)
    {
        5
    } else if settings.slotsPerFrame > 5 {
        10
    } else {
        5
    };
    let frame_count = usize::try_from(settings.numFrames)
        .ok()
        .filter(|count| *count > 0)
        .unwrap_or_else(|| settings.frames.len().max(1))
        .min(MAX_NUM_FRAMES as usize);

    settings.frames = (0..frame_count)
        .map(|_| FrameConfig {
            latches: LATCHES_PER_FRAME as u8,
            // 10-slot mode: every latch. 5-slot mode: latches 1, 3, 5, 7, 9.
            slots: (0..LATCHES_PER_FRAME)
                .map(|i| stored_slots_per_frame == 10 || i % 2 == 0)
                .collect(),
        })
        .collect();
    settings.numFrames = u32::try_from(settings.frames.len()).unwrap_or(u32::MAX);
    settings.slotsPerFrame = stored_slots_per_frame;
}

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

    normalize_frames(&mut settings);

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
