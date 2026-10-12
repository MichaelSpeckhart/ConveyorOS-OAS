import { invoke } from "@tauri-apps/api/core";

export async function station1JogFwd(): Promise<void> {
    return invoke("station1_jog_fwd");
}

export async function getTargetSlot(): Promise<number> {
    return invoke<number>("get_target_slot_tauri");
}

export async function setTargetSlot(value: number): Promise<void> {
    return invoke("set_target_slot_tauri", { value });
}

export async function slotRunRequest(targetSlot: number): Promise<void> {
    console.log(`Requesting slot run for target slot: ${targetSlot}`);
    await invoke("slot_run_request_tauri", { targetSlot: Math.trunc(targetSlot) });
}

export async function opcConnected(): Promise<boolean> {
    return invoke<boolean>("check_opc_connection_tauri");
}


export async function setNumberOfFrames(numFrames: number): Promise<void> {
    await invoke("set_number_of_frames", { numFrames: Math.trunc(numFrames) });
}

export async function setSlotsPerFrame(slotsPerFrame: number): Promise<void> {
    await invoke("set_slots_per_frame", { slotsPerFrame: Math.trunc(slotsPerFrame) });
}
