//! File Tauri Commands
//!
//! 文件系统相关的前端可调用命令（保留原有功能）

use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

/// 选择目录
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

/// 保存文件
#[tauri::command]
pub async fn save_file(path: String, filename: String, content: Vec<u8>) -> Result<(), String> {
    let full_path = PathBuf::from(&path).join(&filename);

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    fs::write(&full_path, content).map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(())
}

/// 获取下载目录
#[tauri::command]
pub fn get_downloads_dir() -> Result<String, String> {
    dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "无法获取下载目录".to_string())
}

/// 获取用户主目录
#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "无法获取主目录".to_string())
}

/// 确保目录存在并保存文件
#[tauri::command]
pub async fn ensure_directory_and_save(
    directory: String,
    filename: String,
    content: String,
    expand_home: bool,
) -> Result<String, String> {
    let dir_path = if expand_home && directory.starts_with('~') {
        let home =
            dirs::home_dir().ok_or_else(|| "无法获取主目录".to_string())?;
        let rest = directory.strip_prefix("~/").unwrap_or(&directory[1..]);
        home.join(rest)
    } else {
        PathBuf::from(&directory)
    };

    fs::create_dir_all(&dir_path)
        .map_err(|e| format!("创建目录失败 {}: {}", dir_path.display(), e))?;

    let full_path = dir_path.join(&filename);
    fs::write(&full_path, content.as_bytes())
        .map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(full_path.to_string_lossy().to_string())
}
