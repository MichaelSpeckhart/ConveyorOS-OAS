import { invoke } from "@tauri-apps/api/core";
import { LoginResult } from "../types/auth";

export async function authLogin(pin_input: string): Promise<LoginResult> {
  return invoke<LoginResult>("auth_user_login_tauri", {pin_input});
}