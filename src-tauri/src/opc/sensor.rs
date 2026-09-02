use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tokio::time::{sleep, Duration};

use crate::opc::{opc_client::OpcClient, opc_commands::get_load_hanger_sensor};

pub async fn hanger_poll_loop(opc_client: OpcClient, detected: Arc<AtomicBool>) {
    let mut logged_error = false;

    loop {
        match get_load_hanger_sensor(&opc_client).await {
            Ok(value) => {
                detected.store(value, Ordering::Relaxed);
                logged_error = false;
            }
            Err(e) => {
                if !logged_error {
                    log::warn!("Hanger sensor read error: {e}");
                    logged_error = true;
                }
            }
        }

        sleep(Duration::from_millis(10)).await;
    }
}
