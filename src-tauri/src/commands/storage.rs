use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let path = app.path().app_local_data_dir()
        .map_err(|e| format!("Failed to get app local data dir: {}", e))?;
    
    // Ensure parent directory exists
    if !path.exists() {
        fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create local data directory: {}", e))?;
    }
    
    Ok(path.join("config.json"))
}

#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<String, String> {
    let path = get_config_path(&app)?;
    if !path.exists() {
        // Return default config structure if not exists
        let default_config = r#"{"version":"1.0.0","folders":[],"favorites":[],"recent":[]}"#;
        return Ok(default_config.to_string());
    }
    
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read config file: {}", e))
}

#[tauri::command]
pub fn save_config(app: AppHandle, config_json: String) -> Result<(), String> {
    let path = get_config_path(&app)?;
    fs::write(&path, config_json)
        .map_err(|e| format!("Failed to write config file: {}", e))
}
