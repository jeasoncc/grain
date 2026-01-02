//! User SeaORM Entity
//!
//! 用户数据库实体定义

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 用户订阅计划
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "Text")]
#[serde(rename_all = "lowercase")]
pub enum UserPlan {
    #[sea_orm(string_value = "free")]
    Free,

    #[sea_orm(string_value = "premium")]
    Premium,
}

impl Default for UserPlan {
    fn default() -> Self {
        Self::Free
    }
}

/// 用户实体
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    /// 用户 ID (UUID)
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,

    /// 用户名
    pub username: String,

    /// 显示名称
    pub display_name: Option<String>,

    /// 头像 URL
    pub avatar: Option<String>,

    /// 邮箱
    pub email: Option<String>,

    /// 最后登录时间戳（毫秒）
    pub last_login: i64,

    /// 创建时间戳（毫秒）
    pub created_at: i64,

    /// 订阅计划
    pub plan: UserPlan,

    /// 订阅开始时间戳（毫秒）
    pub plan_start_date: Option<i64>,

    /// 订阅到期时间戳（毫秒）
    pub plan_expires_at: Option<i64>,

    /// 试用到期时间戳（毫秒）
    pub trial_expires_at: Option<i64>,

    /// 认证 Token
    pub token: Option<String>,

    /// 服务器消息
    pub server_message: Option<String>,

    /// 功能权限（JSON 字符串）
    pub features: Option<String>,

    /// 应用状态（JSON 字符串）
    pub state: Option<String>,

    /// 用户设置（JSON 字符串）
    pub settings: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
