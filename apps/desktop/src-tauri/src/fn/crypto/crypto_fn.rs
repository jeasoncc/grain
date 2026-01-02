//! 密钥管理纯函数
//!
//! 跨平台密钥链访问，支持：
//! - macOS: Keychain
//! - Windows: Credential Manager
//! - Linux: Secret Service (GNOME Keyring / KWallet)

use crate::types::error::{AppError, AppResult};
use base64::{engine::general_purpose::STANDARD, Engine};
use keyring::Entry;
use rand::Rng;
use tracing::{info, warn};

const SERVICE_NAME: &str = "grain-editor";
const KEY_NAME: &str = "database-key";

// ============================================================================
// 纯函数（无副作用）
// ============================================================================

/// 生成 256 位随机密钥（Base64 编码）
pub fn generate_key() -> String {
    let mut rng = rand::thread_rng();
    let key: [u8; 32] = rng.gen();
    STANDARD.encode(key)
}

/// 获取用于非加密模式的固定密钥（仅用于开发/测试）
#[cfg(debug_assertions)]
pub fn get_dev_key() -> String {
    "grain-dev-key-do-not-use-in-production".to_string()
}

// ============================================================================
// 副作用函数（访问系统密钥链）
// ============================================================================

/// 获取或创建数据库加密密钥
///
/// 如果密钥已存在，从系统密钥链获取；
/// 如果不存在，生成新密钥并存储到密钥链。
pub fn get_or_create_key() -> AppResult<String> {
    let entry = Entry::new(SERVICE_NAME, KEY_NAME)
        .map_err(|e| AppError::KeyringError(format!("创建密钥链入口失败: {}", e)))?;

    // 尝试获取现有密钥
    match entry.get_password() {
        Ok(key) => {
            info!("从系统密钥链获取数据库密钥");
            Ok(key)
        }
        Err(keyring::Error::NoEntry) => {
            // 密钥不存在，生成新密钥
            info!("生成新的数据库加密密钥");
            let new_key = generate_key();
            entry
                .set_password(&new_key)
                .map_err(|e| AppError::KeyringError(format!("存储密钥失败: {}", e)))?;
            Ok(new_key)
        }
        Err(e) => {
            warn!("访问密钥链失败: {}", e);
            Err(AppError::KeyringError(format!("访问密钥链失败: {}", e)))
        }
    }
}

/// 删除密钥（用于重置）
pub fn delete_key() -> AppResult<()> {
    let entry = Entry::new(SERVICE_NAME, KEY_NAME)
        .map_err(|e| AppError::KeyringError(format!("创建密钥链入口失败: {}", e)))?;

    match entry.delete_credential() {
        Ok(()) => {
            info!("已删除数据库加密密钥");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            // 密钥本来就不存在，视为成功
            Ok(())
        }
        Err(e) => Err(AppError::KeyringError(format!("删除密钥失败: {}", e))),
    }
}

/// 检查密钥是否存在
pub fn key_exists() -> AppResult<bool> {
    let entry = Entry::new(SERVICE_NAME, KEY_NAME)
        .map_err(|e| AppError::KeyringError(format!("创建密钥链入口失败: {}", e)))?;

    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(AppError::KeyringError(format!("检查密钥失败: {}", e))),
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_key_length() {
        let key = generate_key();
        // Base64 编码的 32 字节应该是 44 字符（包含填充）
        assert_eq!(key.len(), 44);
    }

    #[test]
    fn test_generate_key_uniqueness() {
        let key1 = generate_key();
        let key2 = generate_key();
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_generate_key_is_valid_base64() {
        let key = generate_key();
        let decoded = STANDARD.decode(&key);
        assert!(decoded.is_ok());
        assert_eq!(decoded.unwrap().len(), 32);
    }

    #[cfg(debug_assertions)]
    #[test]
    fn test_get_dev_key() {
        let key = get_dev_key();
        assert!(!key.is_empty());
        assert!(key.contains("dev"));
    }
}
