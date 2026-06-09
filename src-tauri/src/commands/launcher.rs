use std::process::Command;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;

#[tauri::command]
pub fn launch_app(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    
    // If it's a shortcut (.lnk), try to resolve it first
    let target_path = if path_buf.extension().map_or(false, |ext| ext.eq_ignore_ascii_case("lnk")) {
        match crate::commands::icon_extractor::resolve_lnk(&path_buf) {
            Ok(resolved) => resolved,
            Err(_) => path_buf, // Fallback to raw link path if resolution fails
        }
    } else {
        path_buf
    };

    let target_str = target_path.to_string_lossy().to_string();
    
    // Windows flag: DETACHED_PROCESS = 0x00000008
    // This allows launching the application independently of TaskNest
    const DETACHED_PROCESS: u32 = 0x00000008;
    
    let mut command = Command::new(&target_str);
    
    // Set working directory to application folder so DLLs/assets load correctly
    if let Some(parent) = target_path.parent() {
        if parent.exists() {
            command.current_dir(parent);
        }
    }
    
    command.creation_flags(DETACHED_PROCESS);
    
    command.spawn()
        .map_err(|e| format!("Failed to execute process ({}): {}", target_str, e))?;
        
    Ok(())
}

#[tauri::command]
pub fn select_executable() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Executables & Shortcuts", &["exe", "lnk"])
        .pick_file();
        
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

