use open62541::{ScalarValue, VariantValue, ua};
use tauri::Emitter;

use crate::opc::{opc_client::AppState, opc_commands};



#[tauri::command]
pub async fn station1_jog_fwd(state: tauri::State<'_, AppState>) -> Result<(), String> {
    opc_commands::jog_forward(&state.opc).await
}

#[tauri::command]
pub async fn get_target_slot_tauri(state: tauri::State<'_, AppState>) -> Result<ua::Variant, String> {
    opc_commands::get_target_slot(&state.opc).await
}

#[tauri::command]
pub async fn subscribe_hanger_sensor(
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let mut rx = state.opc
        .subscribe_value(ua::NodeId::numeric(1, 102))
        .await
        .map_err(|e| e.to_string())?;

    let handle = tokio::spawn(async move {
        while let Ok(variant) = rx.recv().await {
            if let VariantValue::Scalar(ScalarValue::Boolean(b)) = variant.to_value() {
                let _ = app_handle.emit("hanger_sensor", b.value());
            }
        }
    });

    let mut task_guard = state.hanger_task.lock().await;
    if let Some(old) = task_guard.take() {
        old.abort();
    }
    *task_guard = Some(handle);

    Ok(())
}

#[tauri::command]
pub async fn slot_run_request_tauri(
    state: tauri::State<'_, AppState>,
    target_slot: i16,
) -> Result<(), String> {
    opc_commands::slot_run_request(&state.opc, target_slot).await
}
