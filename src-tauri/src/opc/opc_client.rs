use std::{collections::HashMap, sync::{Arc, atomic::{AtomicBool, Ordering}}, time::Duration};
use tokio::{sync::{Mutex, broadcast}, task::JoinHandle};
use thiserror::Error;

use open62541::{ua, AsyncClient};


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

    
    pub async fn connect(&self) -> Result<(), OpcError> {
        let client = AsyncClient::new(&self.cfg.endpoint_url)
            .map_err(|e| OpcError::Ua(format!("{e:?}")))?;
        let mut inner = self.inner.lock().await;
        inner.client = Some(Arc::new(client));
        self.connected_flag.store(true, Ordering::Relaxed);
        Ok(())
    }

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


    pub async fn subscribe_value(
        &self,
        node_id: ua::NodeId,
    ) -> Result<broadcast::Receiver<ua::Variant>, OpcError> {
        let key = node_id.to_string();

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

        let client = {
            let inner = self.inner.lock().await;
            inner.client.clone().ok_or(OpcError::NotConnected)?
        };

        tokio::spawn(async move {
            if let Ok(subscription) = client.create_subscription().await {
                if let Ok(mut item) = subscription.create_monitored_item(&node_id).await {
                    while let Some(v) = item.next().await {
                        let _ = tx.send(v.value().unwrap().clone());
                    }
                }
            }
        });

        Ok(rx)
    }

    pub fn start_reconnect_loop(&self) {
        let this = self.clone();
        tokio::spawn(async move {
            loop {
                let connected = {
                    let inner = this.inner.lock().await;
                    inner.client.is_some()
                };

                if !connected {
                    let _ = this.connect().await;
                }
                tokio::time::sleep(this.cfg.reconnect_backoff).await;
            }
        });
    }

    pub async fn check_connection(&self) -> bool {
        let this = self.clone();
        let connected = {
            let inner = this.inner.lock().await;
            inner.client.is_some()
        };

        return connected;
    }

    pub fn is_connected(&self) -> bool {
        self.connected_flag.load(Ordering::Relaxed)
    }
}
