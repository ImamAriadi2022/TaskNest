mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::storage::load_config,
            commands::storage::save_config,
            commands::icon_extractor::extract_icon,
            commands::launcher::launch_app,
            commands::launcher::select_executable,
            commands::launcher::get_installed_apps,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
