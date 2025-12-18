// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Select a directory using the system's native directory picker dialog
/// 
/// # Arguments
/// * `initial_directory` - Optional initial directory to open the dialog in
#[tauri::command]
async fn select_directory(app: tauri::AppHandle, initial_directory: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = app
        .dialog()
        .file()
        .set_title("选择导出目录");
    
    // Set initial directory if provided and exists
    if let Some(ref dir) = initial_directory {
        let path = PathBuf::from(dir);
        if path.exists() && path.is_dir() {
            dialog = dialog.set_directory(path);
        }
    }
    
    let result = dialog.blocking_pick_folder();
    
    match result {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// Save file content to a specified path
#[tauri::command]
async fn save_file(path: String, filename: String, content: Vec<u8>) -> Result<(), String> {
    let full_path = PathBuf::from(&path).join(&filename);
    
    // Ensure the directory exists
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Write the file
    fs::write(&full_path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

/// Get the system's downloads directory
#[tauri::command]
fn get_downloads_dir() -> Result<String, String> {
    dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine downloads directory".to_string())
}

/// Get the user's home directory
#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}

/// Ensure directory exists and save text file
/// Supports ~ expansion for home directory
#[tauri::command]
async fn ensure_directory_and_save(
    directory: String,
    filename: String,
    content: String,
    expand_home: bool,
) -> Result<String, String> {
    // Expand ~ to home directory if needed
    let dir_path = if expand_home && directory.starts_with('~') {
        let home = dirs::home_dir()
            .ok_or_else(|| "Could not determine home directory".to_string())?;
        let rest = directory.strip_prefix("~/").unwrap_or(&directory[1..]);
        home.join(rest)
    } else {
        PathBuf::from(&directory)
    };

    // Create directory recursively
    fs::create_dir_all(&dir_path)
        .map_err(|e| format!("Failed to create directory {}: {}", dir_path.display(), e))?;

    // Write the file
    let full_path = dir_path.join(&filename);
    fs::write(&full_path, content.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(full_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            select_directory,
            save_file,
            get_downloads_dir,
            get_home_dir,
            ensure_directory_and_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
