use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub posCsvDir: String,
    pub conveyorCsvOutputDir: String,
    pub dbHost: String,
    pub dbPort: u16,
    pub dbName: String,
    pub dbUser: String,
    pub dbPassword: String,
    pub opcServerUrl: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            posCsvDir: "".to_string(),
            conveyorCsvOutputDir: "".to_string(),
            dbHost: "localhost".to_string(),
            dbPort: 5432,
            dbName: "conveyor-app".to_string(),
            dbUser: "postgres".to_string(),
            dbPassword: "postgres123".to_string(),
            opcServerUrl: "opc.tcp://localhost:4840".to_string(),
        }
    }
}
