use std::path::PathBuf;
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
use windows::core::PCWSTR;

#[derive(serde::Serialize)]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub fn launch_app(path: String) -> Result<(), String> {
    unsafe {
        let wide_path: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();
        let wide_operation: Vec<u16> = "open".encode_utf16().chain(std::iter::once(0)).collect();
        
        let result = ShellExecuteW(
            HWND(std::ptr::null_mut()),
            PCWSTR(wide_operation.as_ptr()),
            PCWSTR(wide_path.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        );
        
        // ShellExecuteW returns a value > 32 on success
        if result.0 as isize > 32 {
            Ok(())
        } else {
            Err(format!("ShellExecuteW failed with error code: {:?}", result.0))
        }
    }
}

#[tauri::command]
pub fn select_executable() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Executables & Shortcuts", &["exe", "lnk"])
        .pick_file();
        
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

fn scan_shortcuts(dir: &std::path::Path, shortcuts: &mut Vec<PathBuf>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                scan_shortcuts(&path, shortcuts);
            } else if path.extension().map_or(false, |ext| ext.eq_ignore_ascii_case("lnk")) {
                shortcuts.push(path);
            }
        }
    }
}

#[tauri::command]
pub fn get_installed_apps() -> Result<Vec<InstalledApp>, String> {
    let mut apps = Vec::new();
    let mut shortcuts = Vec::new();
    
    // 1. ProgramData Start Menu
    if let Ok(program_data) = std::env::var("ProgramData") {
        let path = PathBuf::from(program_data).join("Microsoft\\Windows\\Start Menu\\Programs");
        scan_shortcuts(&path, &mut shortcuts);
    }
    
    // 2. User AppData Start Menu
    if let Ok(app_data) = std::env::var("APPDATA") {
        let path = PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs");
        scan_shortcuts(&path, &mut shortcuts);
    }
    
    // 3. User Desktop
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let path = PathBuf::from(user_profile).join("Desktop");
        scan_shortcuts(&path, &mut shortcuts);
    }
    
    // 4. Public Desktop
    if let Ok(public_dir) = std::env::var("PUBLIC") {
        let path = PathBuf::from(public_dir).join("Desktop");
        scan_shortcuts(&path, &mut shortcuts);
    }
    
    let mut seen = std::collections::HashSet::new();
    for path in shortcuts {
        if let Some(file_name) = path.file_stem() {
            let name = file_name.to_string_lossy().to_string();
            let path_str = path.to_string_lossy().to_string();
            
            // Avoid adding duplicates with exact same name
            if !seen.contains(&name) {
                seen.insert(name.clone());
                apps.push(InstalledApp {
                    name,
                    path: path_str,
                });
            }
        }
    }
    
    // Sort alphabetically by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    
    Ok(apps)
}


