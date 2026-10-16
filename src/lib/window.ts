import { invoke } from "@tauri-apps/api/core";

export async function minimizeAppWindow(): Promise<void> {
  return invoke<void>("minimize_app_window");
}

/** Ends the operator's session (if any) and quits the app. */
export async function exitApp(sessionId: number | null): Promise<void> {
  return invoke<void>("exit_app", { sessionId });
}
