import { Store } from "@tauri-apps/plugin-store";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { DEFAULT_TICKET_TEMPLATE, type TicketTemplateConfig } from "../types/printer";

export type FrameConfig = {
  latches: number;
  slots: boolean[];
};

export type FieldMappings = {
  customerIdentifier: number;
  customerFirstName?: number;
  customerLastName?: number;
  customerPhone?: number;
  addressOne?: number;
  addressTwo?: number;
  city?: number;
  state?: number;
  zipCode?: number;
  servicePrice?: number;
  serviceType?: number;
  garmentColor?: number;
  transactionDate?: number;
  transactionTime?: number;
  fullInvoiceNumber: number;
  displayInvoiceNumber: number;
  numItems: number;
  slotOccupancy: number;
  itemId: number;
  itemDescription: number;
  dropoffDate: number;
  pickupDate: number;
  comments: number;
};

export type PrinterSettings = {
  connectionType: string;
  selectedPrinter: string;
  portPath: string;
  paperSize: string;
  orientation: string;
  quality: string;
  copies: number;
  colorMode: string;
  ticketTemplate: TicketTemplateConfig;
};

export type AppSettings = {
  posCsvDir: string;
  conveyorCsvOutputDir: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  opcServerUrl?: string;
  posSystem: string;
  fieldMappings: FieldMappings;
  printer: PrinterSettings;
  frames: FrameConfig[];
  numFrames: number;
  slotsPerFrame: number;
};

export type SlotMode = 5 | 10;

export const DEFAULT_NUM_FRAMES = 1;

const DEFAULT_FIELD_MAPPINGS: FieldMappings = {
  customerIdentifier: 6,
  customerFirstName: 7,
  customerLastName: 8,
  customerPhone: 10,
  addressOne: 18,
  addressTwo: 19,
  city: 20,
  state: 21,
  zipCode: 22,
  transactionDate: 16,
  fullInvoiceNumber: 1,
  displayInvoiceNumber: 2,
  numItems: 3,
  slotOccupancy: 4,
  itemId: 11,
  itemDescription: 12,
  dropoffDate: 13,
  pickupDate: 14,
  comments: 15,
};

const DEFAULT_PRINTER: PrinterSettings = {
  connectionType: "system",
  selectedPrinter: "",
  portPath: "",
  paperSize: "Letter",
  orientation: "portrait",
  quality: "normal",
  copies: 1,
  colorMode: "grayscale",
  ticketTemplate: DEFAULT_TICKET_TEMPLATE,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  posCsvDir: "",
  conveyorCsvOutputDir: "",
  dbHost: "localhost",
  dbPort: 5432,
  dbName: "conveyor-app",
  dbUser: "postgres",
  dbPassword: "postgres123",
  opcServerUrl: "opc.tcp://localhost:4840",
  posSystem: "spot",
  fieldMappings: DEFAULT_FIELD_MAPPINGS,
  printer: DEFAULT_PRINTER,
  frames: createSlotModeFrames(5, DEFAULT_NUM_FRAMES),
  numFrames: DEFAULT_NUM_FRAMES,
  slotsPerFrame: 5,
};

export function createSlotModeFrames(slotMode: SlotMode, numFrames = DEFAULT_NUM_FRAMES): FrameConfig[] {
  const frameCount = Math.max(1, Math.trunc(numFrames) || DEFAULT_NUM_FRAMES);
  return Array.from({ length: frameCount }, () => ({
    latches: slotMode,
    slots: Array(slotMode).fill(true),
  }));
}

export function getSlotMode(settings: AppSettings): SlotMode {
  const slotsPerFrame = settings.frames[0]?.slots?.length ?? settings.slotsPerFrame ?? 5;
  return slotsPerFrame <= 5 ? 5 : 10;
}

export function getFrameCount(settings: AppSettings): number {
  return Math.max(1, settings.frames.length || settings.numFrames || DEFAULT_NUM_FRAMES);
}

function normalizeFrames(frames: FrameConfig[] | undefined, numFrames?: number, slotsPerFrame?: number): FrameConfig[] {
  const firstFrame = frames?.[0];
  if (!firstFrame) {
    const slotMode: SlotMode = slotsPerFrame && slotsPerFrame > 5 ? 10 : 5;
    return createSlotModeFrames(slotMode, numFrames ?? DEFAULT_NUM_FRAMES);
  }

  const frameCount = Math.max(1, Math.trunc(numFrames ?? frames?.length ?? DEFAULT_NUM_FRAMES));
  const detectedSlotsPerFrame = slotsPerFrame ?? firstFrame.slots?.length ?? firstFrame.latches ?? 5;
  const slotMode: SlotMode = detectedSlotsPerFrame <= 5 ? 5 : 10;
  return createSlotModeFrames(slotMode, frameCount);
}

export function createDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    fieldMappings: { ...DEFAULT_FIELD_MAPPINGS },
    printer: {
      ...DEFAULT_PRINTER,
      ticketTemplate: {
        ...DEFAULT_TICKET_TEMPLATE,
        fields: DEFAULT_TICKET_TEMPLATE.fields.map((field) => ({ ...field })),
      },
    },
    frames: DEFAULT_APP_SETTINGS.frames.map((frame) => ({
      ...frame,
      slots: [...frame.slots],
    })),
  };
}

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
  if (!saved) return createDefaultSettings();

  const defaults = createDefaultSettings();
  const frames = normalizeFrames(saved.frames ?? defaults.frames, saved.numFrames, saved.slotsPerFrame);
  return {
    ...defaults,
    ...saved,
    fieldMappings: { ...DEFAULT_FIELD_MAPPINGS, ...saved.fieldMappings },
    printer: {
      ...DEFAULT_PRINTER,
      ...saved.printer,
      ticketTemplate: {
        ...DEFAULT_TICKET_TEMPLATE,
        ...saved.printer?.ticketTemplate,
        fields: saved.printer?.ticketTemplate?.fields ?? DEFAULT_TICKET_TEMPLATE.fields,
      },
    },
    frames,
    numFrames: frames.length,
    slotsPerFrame: frames[0]?.slots?.length ?? frames[0]?.latches ?? 0,
  };
}

export async function saveSettings(s: AppSettings): Promise<void> {
  const frames = normalizeFrames(s.frames, s.numFrames, s.slotsPerFrame);
  const numFrames = frames.length;
  const slotsPerFrame = frames[0]?.slots?.length ?? frames[0]?.latches ?? 0;

  await invoke("save_settings_tauri", {
    dbHost: s.dbHost,
    dbPort: s.dbPort,
    dbName: s.dbName,
    dbUser: s.dbUser,
    dbPassword: s.dbPassword,
    opcServerUrl: s.opcServerUrl ?? "",
    posCsvDir: s.posCsvDir,
    conveyorCsvOutputDir: s.conveyorCsvOutputDir,
    posSystem: s.posSystem,
    fieldMappings: s.fieldMappings,
    printer: s.printer,
    frames,
    numFrames,
    slotsPerFrame,
  });
}

export async function pickPosCsvFile(): Promise<string | null> {
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  return typeof file === "string" ? file : null;
}

export async function pickConveyorOutputDir(): Promise<string | null> {
  const dir = await open({
    multiple: false,
    directory: true,
  });

  return typeof dir === "string" ? dir : null;
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
    return createDefaultSettings();
  }
}
