use open62541::ua::Variant;

use crate::opc::{opc_client::{self, AppState}, opc_commands};



#[tauri::command]
pub async fn station1_jog_fwd(state: tauri::State<'_, AppState>) -> Result<(), String> {
    opc_commands::jog_forward(&state.opc).await
}

#[tauri::command]
pub async fn get_target_slot_tauri(state: tauri::State<'_, AppState>) -> Result<Variant, String> {
    opc_commands::get_target_slot(&state.opc).await
}

#[tauri::command]
pub async fn slot_run_request_tauri(
    state: tauri::State<'_, AppState>,
    targetSlot: i16,
) -> Result<(), String> {
    opc_commands::slot_run_request(&state.opc, targetSlot).await
}
