import { invoke } from "@tauri-apps/api/core";

export async function readSlotId1(): Promise<number> {
  return invoke<number>("read_slot_id1");
}

export async function writeSlotId1(value: number): Promise<void> {
  return invoke("write_slot_id1", { value });
}

export async function writeJogForward(value: boolean): Promise<void> {
  return invoke("write_m5_command", { state: value });
}

export async function writeJogReverse(value: boolean): Promise<void> {
  return invoke("write_m6_command", { state: value });
}