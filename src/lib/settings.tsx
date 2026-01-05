import { Store } from "@tauri-apps/plugin-store";
import { open } from "@tauri-apps/plugin-dialog";

export type AppSettings = {
  posCsvDir: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
};

const DEFAULTS: AppSettings = {
  posCsvDir: "",
  dbHost: "localhost",
  dbPort: 5432,
  dbName: "conveyor",
  dbUser: "postgres",
  dbPassword: "",
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