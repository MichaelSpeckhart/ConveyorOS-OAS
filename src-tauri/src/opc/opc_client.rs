use std::{collections::HashMap, sync::{Arc, atomic::{AtomicBool, Ordering}}, time::Duration};
use tokio::{sync::{Mutex, broadcast, futures}, task::JoinHandle};
use thiserror::Error;

use open62541::{ua, AsyncClient};

use crate::plc::client;

#[derive(Debug, Error)]
pub enum OpcError {
    #[error("OPC-UA: {0}")]
    Ua(String),
    #[error("Not connected")]
    NotConnected,
}

#[derive(Clone)]
pub struct AppState {
    pub opc: crate::opc::opc_client::OpcClient,
    pub hanger_detected: Arc<AtomicBool>,
    pub hanger_task: Arc<Mutex<Option<JoinHandle<()>>>>,
}

#[derive(Clone, Debug)]
pub struct OpcConfig {
    pub endpoint_url: String,
    pub reconnect_backoff: Duration,
}

#[derive(Clone)]
pub struct OpcClient {
    cfg: OpcConfig,
    inner: Arc<Mutex<Inner>>,
    connected_flag: Arc<AtomicBool>,
}

struct Inner {
    client: Option<Arc<AsyncClient>>,
    // node_id -> broadcast channel for value updates
    subs: HashMap<String, broadcast::Sender<ua::Variant>>,
}

impl OpcClient {
    pub fn new(cfg: OpcConfig) -> Self {
        Self {
            cfg,
            inner: Arc::new(Mutex::new(Inner {
                client: None,
                subs: HashMap::new(),
            })),
            connected_flag: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Connect once. You can call this at app startup.
    pub async fn connect(&self) -> Result<(), OpcError> {
        let client = AsyncClient::new(&self.cfg.endpoint_url)
            .map_err(|e| OpcError::Ua(format!("{e:?}")))?;
        let mut inner = self.inner.lock().await;
        inner.client = Some(Arc::new(client));
        self.connected_flag.store(true, Ordering::Relaxed);
        Ok(())
    }

    /// Read Value attribute of a node.
    pub async fn read_value(&self, node_id: ua::NodeId) -> Result<ua::Variant, OpcError> {
        let client = {
            let inner = self.inner.lock().await;
            inner.client.clone().ok_or(OpcError::NotConnected)?
        };

        let dv = client
            .read_value(&node_id)
            .await
            .map_err(|e| OpcError::Ua(format!("{e:?}")))?;

        Ok(dv.value().unwrap().clone())
    }

    pub async fn write_value(
        &self,
        node_id: ua::NodeId,
        value: ua::DataValue,
    ) -> Result<(), OpcError> {
        let client = {
            let inner = self.inner.lock().await;
            inner.client.clone().ok_or(OpcError::NotConnected)?
        };

        client
            .write_value(&node_id, &value).await
            .map_err(|e| OpcError::Ua(format!("{e:?}")))?;

        Ok(())
    }

    /// Subscribe to value changes of a node.
    /// Returns a Receiver that gets ua::Variant updates.
    ///
    /// If called multiple times for the same node, you get another Receiver on the same channel.
    pub async fn subscribe_value(
        &self,
        node_id: ua::NodeId,
    ) -> Result<broadcast::Receiver<ua::Variant>, OpcError> {
        let key = node_id.to_string();

        // Create (or reuse) the broadcast channel
        let (tx, rx) = {
            let mut inner = self.inner.lock().await;
            if let Some(existing) = inner.subs.get(&key) {
                (existing.clone(), existing.subscribe())
            } else {
                let (tx, rx) = broadcast::channel(256);
                inner.subs.insert(key.clone(), tx.clone());
                (tx, rx)
            }
        };

        // Ensure we’re connected
        let client = {
            let inner = self.inner.lock().await;
            inner.client.clone().ok_or(OpcError::NotConnected)?
        };

        // Create subscription + monitored item, and forward updates into broadcast channel
        //
        // docs.rs pattern:
        // - create_subscription()
        // - create_monitored_item()
        // - monitored_item.next().await yields values :contentReference[oaicite:3]{index=3}
        tokio::spawn(async move {
            // If this task errors out (disconnect), it just stops.
            // Your higher-level reconnect loop (below) should recreate it.
            if let Ok(subscription) = client.create_subscription().await {
                if let Ok(mut item) = subscription.create_monitored_item(&node_id).await {
                    while let Some(v) = item.next().await {
                        // Ignore send errors (no active receivers)
                        let _ = tx.send(v.value().unwrap().clone());
                    }
                }
            }
        });

        Ok(rx)
    }

    /// Runs forever: ensures connection, and if connection drops, reconnects.
    /// You’d typically spawn this once at app startup.
    pub fn start_reconnect_loop(&self) {
        let this = self.clone();
        tokio::spawn(async move {
            loop {
                // if not connected, try connect
                let connected = {
                    let inner = this.inner.lock().await;
                    inner.client.is_some()
                };

                if !connected {
                    let _ = this.connect().await;
                }

                // Note: open62541 AsyncClient handles connection internally.
                // Practically, you’ll detect disconnect via failed reads or subscription task exit.
                // This loop is a “safety net” — for production you often add a health check read.
                tokio::time::sleep(this.cfg.reconnect_backoff).await;
            }
        });
    }

    pub fn is_connected(&self) -> bool {
        self.connected_flag.load(Ordering::Relaxed)
    }
}
