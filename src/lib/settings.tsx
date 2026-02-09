import { Store } from "@tauri-apps/plugin-store";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export type AppSettings = {
  posCsvDir: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  opcServerUrl?: string;
};

const DEFAULTS: AppSettings = {
  posCsvDir: "",
  dbHost: "localhost",
  dbPort: 5432,
  dbName: "conveyor",
  dbUser: "postgres",
  dbPassword: "",
  opcServerUrl: "opc.tcp://localhost:4840",
};

let storePromise: Promise<Store> | null = null;

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = Store.load("settings.json");
  }
  return storePromise;
}

export async function loadSettings(): Promise<AppSettings> {
  const store = await getStore();
  const saved = (await store.get<AppSettings>("app_settings")) ?? null;
  return saved ? { ...DEFAULTS, ...saved } : DEFAULTS;
}

export async function saveSettings(s: AppSettings): Promise<void> {
  const store = await getStore();
  await store.set("app_settings", s);
  await store.save();
}

export async function pickPosCsvFile(): Promise<string | null> {
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  return typeof file === "string" ? file : null;
}

export async function testDatabaseConnection(
  dbHost: string,
  dbPort: number,
  dbName: string,
  dbUser: string,
  dbPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await invoke<string>("test_database_connection_tauri", {
      dbHost,
      dbPort,
      dbName,
      dbUser,
      dbPassword,
    });
    return { success: true, message: result };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export async function checkSetupRequired(): Promise<boolean> {
  try {
    return await invoke<boolean>("check_setup_required_tauri");
  } catch (error) {
    console.error("Failed to check setup required:", error);
    return true; // Assume setup required if check fails
  }
}

export async function getCurrentSettings(): Promise<AppSettings> {
  try {
    return await invoke<AppSettings>("get_current_settings_tauri");
  } catch (error) {
    console.error("Failed to get current settings:", error);
    return DEFAULTS;
  }
}