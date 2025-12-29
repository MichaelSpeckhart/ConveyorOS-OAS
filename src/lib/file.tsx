import { invoke } from "@tauri-apps/api/core";

export async function readFile(path: string): Promise<Array<string>> {
  return invoke<Array<string>>("read_file_cmd", {path});
}

export async function readDelCsvFile(contents: Array<string>): Promise<number> {
    return invoke<number>("parse_spot_csv", {contents});
}

export async function parseSpotCsv(path: string): Promise<number> {
    return invoke<number>("parse_spot_csv_tauri", {path});
}
