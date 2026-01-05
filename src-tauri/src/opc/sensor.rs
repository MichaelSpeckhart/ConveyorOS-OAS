use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};
use open62541::ua;
use tokio::time::{sleep, Duration};

use crate::opc::{opc_client::OpcClient, opc_commands::get_load_hanger_sensor};


pub async fn hanger_poll_loop(
    opc_client: OpcClient,
    detected: Arc<AtomicBool>,
) {
    loop {
        match get_load_hanger_sensor(&opc_client).await {
            Ok(value) => {
                let sensed = value;

                detected.store(sensed, Ordering::Relaxed);
            }
            Err(e) => {
                eprintln!("Sensor read error: {e}");
            }
        }

        // ⚡ poll every 10ms
        sleep(Duration::from_millis(10)).await;
    }
}
