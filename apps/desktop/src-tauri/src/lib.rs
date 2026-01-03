//! Grain Desktop 应用
//!
//! 所有逻辑都在 rust-core 中实现，这里只提供 tauri.conf.json 的 context

pub fn run() {
    rust_core::tauri::init_logging();
    rust_core::tauri::create_builder()
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
