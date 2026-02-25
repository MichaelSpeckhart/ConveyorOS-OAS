import { invoke } from "@tauri-apps/api/core";

export async function UnloadItem(itemId: string): Promise<void> {
    return invoke<void>("unload_item_tauri", { item_id:itemId });
}

export async function LoadItem(itemId: string): Promise<void> {
    return invoke<void>("load_item_tauri", { item_id:itemId });
}