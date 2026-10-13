//! File Tauri Commands

use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn select_directory(
    app: tauri::AppHandle,
    initial_directory: Option<String>,
) -> Result<Option<String>, String> {
    let mut dialog = app.dialog().file().set_title("选择导出目录");

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

#[tauri::command]
pub fn get_downloads_dir() -> Result<String, String> {
    dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "无法获取下载目录".to_string())
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "无法获取主目录".to_string())
}

