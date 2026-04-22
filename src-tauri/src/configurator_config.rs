use std::path::PathBuf;

const CONFIGURATOR_BUNDLE_ID: &str = "com.michaelspeckhart.conveyoros-configurator";

fn config_path() -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
        Ok(PathBuf::from(home)
            .join("Library/Application Support")
            .join(CONFIGURATOR_BUNDLE_ID)
            .join("config.json"))
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").map_err(|_| "APPDATA not set".to_string())?;
        Ok(PathBuf::from(appdata)
            .join(CONFIGURATOR_BUNDLE_ID)
            .join("config.json"))
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
        Ok(PathBuf::from(home)
            .join(".config")
            .join(CONFIGURATOR_BUNDLE_ID)
            .join("config.json"))
    }
}

pub struct ConfiguratorDirs {
    /// Full path to the POS input file: {watchDirectory}/POS.csv
    pub pos_csv_path: String,
    pub output_directory: String,
}

pub fn read_dirs() -> Result<ConfiguratorDirs, String> {
    let path = config_path()?;
    if !path.exists() {
        return Err(format!("Configurator config not found at {}", path.display()));
    }
    let data = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read Configurator config: {e}"))?;
    let val: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse Configurator config: {e}"))?;

    let watch_dir = val["dataSource"]["watchDirectory"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let output_dir = val["dataSource"]["outputDirectory"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let pos_csv_path = if watch_dir.is_empty() {
        String::new()
    } else {
        PathBuf::from(&watch_dir)
            .join("POS.csv")
            .to_string_lossy()
            .into_owned()
    };

    Ok(ConfiguratorDirs { pos_csv_path, output_directory: output_dir })
}

#[tauri::command]
pub fn get_configurator_dirs_tauri() -> Result<(String, String), String> {
    let dirs = read_dirs()?;
    Ok((dirs.pos_csv_path, dirs.output_directory))
}
