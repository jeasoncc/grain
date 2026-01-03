//! Grain API Server
//!
//! 所有逻辑都在 rust-core 中实现

#[tokio::main]
async fn main() {
    rust_core::server::run_server().await;
}
