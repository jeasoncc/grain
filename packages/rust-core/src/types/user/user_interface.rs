//! User DTO 接口定义
//!
//! 定义用户相关的数据传输对象（DTO）

use super::user_entity::UserPlan;
use serde::{Deserialize, Serialize};

// ============================================================================
// 嵌套类型
// ============================================================================

/// 用户功能权限
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UserFeatures {
    pub can_use_all_scenes: Option<bool>,
    pub can_export_pdf: Option<bool>,
    pub can_use_cloud_sync: Option<bool>,
    pub show_ads: Option<bool>,
    pub reminder_interval: Option<i32>,
}

/// 用户应用状态
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UserState {
    pub last_location: Option<String>,
    pub current_project: Option<String>,
    pub current_chapter: Option<String>,
    pub current_scene: Option<String>,
    pub current_title: Option<String>,
    pub current_typing: Option<String>,
    pub last_cloud_save: Option<String>,
    pub last_local_save: Option<String>,
    pub is_user_logged_in: Option<bool>,
}

/// 用户设置
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UserSettings {
    pub theme: Option<String>,
    pub language: Option<String>,
    pub autosave: Option<bool>,
    pub spell_check: Option<bool>,
    pub last_location: Option<bool>,
    pub font_size: Option<String>,
}

// ============================================================================
// 请求 DTO
// ============================================================================

/// 创建用户请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub username: String,
    pub display_name: Option<String>,
    pub avatar: Option<String>,
    pub email: Option<String>,
    pub plan: Option<UserPlan>,
    pub features: Option<UserFeatures>,
    pub settings: Option<UserSettings>,
}

/// 更新用户请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    pub username: Option<String>,
    pub display_name: Option<Option<String>>,
    pub avatar: Option<Option<String>>,
    pub email: Option<Option<String>>,
    pub last_login: Option<i64>,
    pub plan: Option<UserPlan>,
    pub plan_start_date: Option<Option<i64>>,
    pub plan_expires_at: Option<Option<i64>>,
    pub trial_expires_at: Option<Option<i64>>,
    pub token: Option<Option<String>>,
    pub server_message: Option<Option<String>>,
    pub features: Option<Option<UserFeatures>>,
    pub state: Option<Option<UserState>>,
    pub settings: Option<Option<UserSettings>>,
}

// ============================================================================
// 响应 DTO
// ============================================================================

/// 用户响应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub display_name: Option<String>,
    pub avatar: Option<String>,
    pub email: Option<String>,
    pub last_login: i64,
    pub created_at: i64,
    pub plan: UserPlan,
    pub plan_start_date: Option<i64>,
    pub plan_expires_at: Option<i64>,
    pub trial_expires_at: Option<i64>,
    pub token: Option<String>,
    pub server_message: Option<String>,
    pub features: Option<UserFeatures>,
    pub state: Option<UserState>,
    pub settings: Option<UserSettings>,
}

/// Entity -> DTO 转换
impl From<super::user_entity::Model> for UserResponse {
    fn from(model: super::user_entity::Model) -> Self {
        Self {
            id: model.id,
            username: model.username,
            display_name: model.display_name,
            avatar: model.avatar,
            email: model.email,
            last_login: model.last_login,
            created_at: model.created_at,
            plan: model.plan,
            plan_start_date: model.plan_start_date,
            plan_expires_at: model.plan_expires_at,
            trial_expires_at: model.trial_expires_at,
            token: model.token,
            server_message: model.server_message,
            features: model.features.and_then(|s| serde_json::from_str(&s).ok()),
            state: model.state.and_then(|s| serde_json::from_str(&s).ok()),
            settings: model.settings.and_then(|s| serde_json::from_str(&s).ok()),
        }
    }
}
