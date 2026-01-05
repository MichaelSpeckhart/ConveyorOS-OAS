import { invoke } from "@tauri-apps/api/core";
import { LoginResult } from "../types/auth";

export async function authLogin(pin_input: string): Promise<LoginResult> {
  console.log("Invoking auth_user_login_tauri with pin_input:", pin_input);
  return invoke<LoginResult>("auth_user_login_tauri", {pin_input});
}