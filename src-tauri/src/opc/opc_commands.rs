use crate::opc::opc_client::OpcClient;
use open62541::{
    ua::{self, DataValue},
    ScalarValue, VariantValue,
};
use std::time::Duration;
use tauri::State;

pub fn get_opc_client(opc_client: State<OpcClient>) -> OpcClient {
    opc_client.inner().clone()
}

pub async fn set_speed(opc_client: &mut OpcClient, node_id: ua::NodeId, speed: DataValue) {
    let _ = opc_client.write_value(node_id, speed).await;
}

pub async fn get_speed(opc_client: &mut OpcClient, node_id: ua::NodeId) -> Option<DataValue> {
    match opc_client.read_value(node_id).await {
        Ok(value) => Some(DataValue::new(value)),
        Err(_) => None,
    }
}

pub async fn jog_forward(opc_client: &OpcClient) -> Result<(), String> {
    println!("Jogging station 1 forward");
    match opc_client
        .write_value(
            ua::NodeId::numeric(1, 81),
            DataValue::new(ua::Variant::scalar(ua::Boolean::new(true))),
        )
        .await
    {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub async fn slot_run_request(opc_client: &OpcClient, target_slot: i16) -> Result<(), String> {
    println!("Slot Run Request");
    set_target_slot(opc_client, target_slot).await?;
    opc_client
        .write_value(
            ua::NodeId::numeric(1, 67),
            DataValue::new(ua::Variant::scalar(ua::Boolean::new(false))),
        )
        .await
        .map_err(|e| e.to_string())?;

    let _ = match opc_client
        .write_value(
            ua::NodeId::numeric(1, 67),
            DataValue::new(ua::Variant::scalar(ua::Boolean::new(true))),
        )
        .await
    {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    };

    opc_client
        .write_value(
            ua::NodeId::numeric(1, 67),
            DataValue::new(ua::Variant::scalar(ua::Boolean::new(false))),
        )
        .await
        .map_err(|e| e.to_string())
}

pub async fn set_target_slot(opc_client: &OpcClient, target_slot: i16) -> Result<(), String> {
    println!("Slot Run Request");
    match opc_client
        .write_value(
            ua::NodeId::numeric(1, 238),
            DataValue::new(ua::Variant::scalar(ua::Int16::new(target_slot))),
        )
        .await
    {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub async fn get_target_slot(opc_client: &OpcClient) -> Result<ua::Variant, String> {
    println!("Get Target Slot");
    opc_client
        .read_value(ua::NodeId::numeric(1, 238))
        .await
        .map_err(|e| e.to_string())
}

pub async fn get_load_hanger_sensor(opc_client: &OpcClient) -> Result<bool, String> {
    let v: ua::Variant = opc_client
        .read_value(ua::NodeId::numeric(1, 86))
        .await
        .map_err(|e| e.to_string())?;

    match v.to_value() {
        VariantValue::Scalar(ScalarValue::Boolean(b)) => Ok(b.value()),
        other => Err(format!("Expected Boolean at ns=1;i=99, got: {other:?}")),
    }
}

pub fn check_opc_connection(opc_client: &OpcClient) -> bool {
    opc_client.is_connected()
}

pub async fn set_number_of_frames(opc_client: &OpcClient, num_frames: i16) -> Result<(), String> {
    opc_client
        .write_value(
            ua::NodeId::numeric(1, 230),
            DataValue::new(ua::Variant::scalar(ua::Int16::new(num_frames))),
        )
        .await
        .map_err(|e| e.to_string())
}

pub async fn set_slots_per_frame(
    opc_client: &OpcClient,
    slots_per_frame: i16,
) -> Result<(), String> {
    opc_client
        .write_value(
            ua::NodeId::numeric(1, 232),
            DataValue::new(ua::Variant::scalar(ua::Int16::new(slots_per_frame))),
        )
        .await
        .map_err(|e| e.to_string())
}

pub async fn get_heartbeat_value(opc_client: &OpcClient) -> Result<i16, String> {
    let v: ua::Variant = opc_client
        .read_value(ua::NodeId::numeric(1, 208))
        .await
        .map_err(|e| e.to_string())?;

    match v.to_value() {
        VariantValue::Scalar(ScalarValue::Int16(i)) => Ok(i.value()),
        other => Err(format!("Expected Int16 at ns=1;i=208, got: {other:?}")),
    }
}

pub async fn set_heartbeat_value(opc_client: &OpcClient, value: i16) -> Result<(), String> {
    opc_client
        .write_value(
            ua::NodeId::numeric(1, 209),
            DataValue::new(ua::Variant::scalar(ua::Int16::new(value))),
        )
        .await
        .map_err(|e| e.to_string())
}

pub fn start_heartbeat_read_loop(
    opc_client: OpcClient,
    interval: Duration,
) -> tauri::async_runtime::JoinHandle<()> {
    tauri::async_runtime::spawn(async move {
        let mut last_value: Option<i16> = None;

        loop {
            match get_heartbeat_value(&opc_client).await {
                Ok(value) => {
                    if last_value != Some(value) {
                        println!("PLC heartbeat: {value}");
                        last_value = Some(value);
                    }
                }
                Err(e) => {
                    eprintln!("Heartbeat read error: {e}");
                }
            }

            tokio::time::sleep(interval).await;
        }
    })
}

pub fn start_heartbeat_write_loop(
    opc_client: OpcClient,
    interval: Duration,
) -> tauri::async_runtime::JoinHandle<()> {
    tauri::async_runtime::spawn(async move {
        let mut value: i16 = 0;

        loop {
            if let Err(e) = set_heartbeat_value(&opc_client, value).await {
                eprintln!("Heartbeat write error: {e}");
            }
            if value == 30000 {
                value = 1;
            }
            value = value.wrapping_add(1);

            tokio::time::sleep(interval).await;
        }
    })
}
