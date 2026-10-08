import { invoke } from "@tauri-apps/api/core";

export type AppLogEntry = {
  id: number;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  details?: string | null;
};

export async function getAppLogs(): Promise<AppLogEntry[]> {
  return invoke<AppLogEntry[]>("get_app_logs_tauri");
}

export async function clearAppLogs(): Promise<void> {
  await invoke<void>("clear_app_logs_tauri");
}
