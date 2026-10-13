//! 密钥管理纯函数
//!
//! 跨平台密钥链访问，支持：
//! - macOS: Keychain
//! - Windows: Credential Manager
//! - Linux: kernel keyutils（保留现有密钥的描述和生命周期）

use crate::types::error::{AppError, AppResult};
use base64::{engine::general_purpose::STANDARD, Engine};
use keyring_core::Entry;
use std::sync::{Arc, LazyLock};
use tracing::{info, warn};

const SERVICE_NAME: &str = "grain-editor";
const KEY_NAME: &str = "database-key";

// Use the native stores directly: keyring 4's all-in-one default would move
// Linux credentials from keyutils to Secret Service, hiding existing keys.
static CREDENTIAL_STORE: LazyLock<keyring_core::Result<Arc<keyring_core::CredentialStore>>> =
    LazyLock::new(native_credential_store);

fn native_credential_store() -> keyring_core::Result<Arc<keyring_core::CredentialStore>> {
    #[cfg(target_os = "linux")]
    {
        // Store::new() uses "keyring:", whereas keyring 3 used "keyring-rs:".
        let configuration = std::collections::HashMap::from([("prefix", "keyring-rs:")]);
        Ok(linux_keyutils_keyring_store::Store::new_with_configuration(&configuration)?)
    }
    #[cfg(target_os = "macos")]
    {
        Ok(apple_native_keyring_store::keychain::Store::new()?)
    }
    #[cfg(target_os = "windows")]
    {
        Ok(windows_native_keyring_store::Store::new()?)
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        Err(keyring_core::Error::Invalid(
            "platform".to_owned(),
            "No supported native credential store".to_owned(),
        ))
    }
}

fn credential_entry(service: &str, user: &str) -> AppResult<Entry> {
    let store = CREDENTIAL_STORE
        .as_ref()
        .map_err(|error| AppError::keyring_error(&format!("初始化密钥链失败: {}", error)))?;
    store
        .build(service, user, None)
        .map_err(|error| AppError::keyring_error(&format!("创建密钥链入口失败: {}", error)))
}

// ============================================================================
// 纯函数（无副作用）
// ============================================================================

/// 生成 256 位随机密钥（Base64 编码）
pub fn generate_key() -> String {
    let key: [u8; 32] = rand::random();
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
    let entry = credential_entry(SERVICE_NAME, KEY_NAME)?;

    // 尝试获取现有密钥
    match entry.get_password() {
        Ok(key) => {
            info!("从系统密钥链获取数据库密钥");
            Ok(key)
        }
        Err(keyring_core::Error::NoEntry) => {
            // 密钥不存在，生成新密钥
            info!("生成新的数据库加密密钥");
            let new_key = generate_key();
            entry
                .set_password(&new_key)
                .map_err(|e| AppError::keyring_error(&format!("存储密钥失败: {}", e)))?;
            Ok(new_key)
        }
        Err(e) => {
            warn!("访问密钥链失败: {}", e);
            Err(AppError::keyring_error(&format!("访问密钥链失败: {}", e)))
        }
    }
}

/// 删除密钥（用于重置）
pub fn delete_key() -> AppResult<()> {
    let entry = credential_entry(SERVICE_NAME, KEY_NAME)?;

    match entry.delete_credential() {
        Ok(()) => {
            info!("已删除数据库加密密钥");
            Ok(())
        }
        Err(keyring_core::Error::NoEntry) => {
            // 密钥本来就不存在，视为成功
            Ok(())
        }
        Err(e) => Err(AppError::keyring_error(&format!("删除密钥失败: {}", e))),
    }
}

/// 检查密钥是否存在
pub fn key_exists() -> AppResult<bool> {
    let entry = credential_entry(SERVICE_NAME, KEY_NAME)?;

    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring_core::Error::NoEntry) => Ok(false),
        Err(e) => Err(AppError::keyring_error(&format!("检查密钥失败: {}", e))),
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


    #[test]
    #[ignore = "explicit native credential smoke; only creates a unique temporary service"]
    fn test_native_temporary_credential_roundtrip() {
        struct Cleanup(Entry);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                let _ = self.0.delete_credential();
            }
        }

        let service = format!("grain-dependency-smoke-{}", uuid::Uuid::new_v4());
        let user = "temporary-database-key";
        let entry = credential_entry(&service, user).unwrap();
        assert!(matches!(entry.get_password(), Err(keyring_core::Error::NoEntry)));
        let cleanup = Cleanup(entry);
        let password = generate_key();
        cleanup.0.set_password(&password).unwrap();
        let reopened = credential_entry(&service, user).unwrap();
        assert_eq!(reopened.get_password().unwrap(), password);
        reopened.delete_credential().unwrap();
        assert!(matches!(
            cleanup.0.get_password(),
            Err(keyring_core::Error::NoEntry)
        ));
    }

}
