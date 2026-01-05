use crate::opc::{self, opc_client::OpcClient};
use diesel::sql_types::Bool;
use open62541::{ScalarValue, VariantValue, ua::{self, DataValue}};
use tauri::State;

pub fn get_opc_client(opc_client: State<OpcClient>) -> OpcClient {
    opc_client.inner().clone()
}

pub async fn set_speed(opc_client: &mut OpcClient, node_id: ua::NodeId, speed: DataValue) {
    opc_client.write_value(node_id, speed).await;
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
            ua::NodeId::numeric(1, 83),
            DataValue::new(ua::Variant::scalar(ua::Boolean::new(false))),
        )
        .await
        .map_err(|e| e.to_string())?;

    match opc_client
        .write_value(
            ua::NodeId::numeric(1, 83),
            DataValue::new(ua::Variant::scalar(ua::Boolean::new(true))),
        )
        .await
    {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    };   

    opc_client
        .write_value(
            ua::NodeId::numeric(1, 83),
            DataValue::new(ua::Variant::scalar(ua::Boolean::new(false))),
        )
        .await
        .map_err(|e| e.to_string())
}

pub async fn set_target_slot(opc_client: &OpcClient, target_slot: i16) -> Result<(), String> {
    println!("Slot Run Request");
    match opc_client
        .write_value(
            ua::NodeId::numeric(1, 267),
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
        .read_value(ua::NodeId::numeric(1, 267))
        .await
        .map_err(|e| e.to_string())
}

pub async fn get_load_hanger_sensor(opc_client: &OpcClient) -> Result<bool, String> {
    let v: ua::Variant = opc_client
        .read_value(ua::NodeId::numeric(1, 26))
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


