use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex, OnceLock,
};

use chrono::Utc;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppLogEntry {
    pub id: u64,
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub message: String,
    pub details: Option<String>,
}

static LOGS: OnceLock<Mutex<Vec<AppLogEntry>>> = OnceLock::new();
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

fn logs() -> &'static Mutex<Vec<AppLogEntry>> {
    LOGS.get_or_init(|| Mutex::new(Vec::new()))
}

pub fn push(level: &str, source: &str, message: impl Into<String>, details: Option<String>) {
    let entry = AppLogEntry {
        id: NEXT_ID.fetch_add(1, Ordering::Relaxed),
        timestamp: Utc::now().to_rfc3339(),
        level: level.to_string(),
        source: source.to_string(),
        message: message.into(),
        details,
    };

    if let Ok(mut entries) = logs().lock() {
        entries.push(entry);
        const MAX_LOGS: usize = 500;
        let overflow = entries.len().saturating_sub(MAX_LOGS);
        if overflow > 0 {
            entries.drain(0..overflow);
        }
    }
}

pub fn error(source: &str, message: impl Into<String>, details: Option<String>) {
    push("error", source, message, details);
}

pub fn list() -> Vec<AppLogEntry> {
    logs()
        .lock()
        .map(|entries| entries.clone())
        .unwrap_or_default()
}

pub fn clear() {
    if let Ok(mut entries) = logs().lock() {
        entries.clear();
    }
}
