//! User 数据库函数
//!
//! 用户相关的 CRUD 操作

use crate::types::user::{UserFeatures, UserSettings, UserState};
use crate::types::{UserActiveModel, UserColumn, UserEntity, UserModel, UserPlan};
use sea_orm::*;

// ============================================================================
// 查询操作
// ============================================================================

/// 获取所有用户
pub async fn find_all(db: &DatabaseConnection) -> Result<Vec<UserModel>, DbErr> {
    UserEntity::find()
        .order_by_desc(UserColumn::LastLogin)
        .all(db)
        .await
}

/// 按 ID 获取用户
pub async fn find_by_id(db: &DatabaseConnection, id: &str) -> Result<Option<UserModel>, DbErr> {
    UserEntity::find_by_id(id).one(db).await
}

/// 按用户名获取用户
pub async fn find_by_username(
    db: &DatabaseConnection,
    username: &str,
) -> Result<Option<UserModel>, DbErr> {
    UserEntity::find()
        .filter(UserColumn::Username.eq(username))
        .one(db)
        .await
}

/// 按邮箱获取用户
pub async fn find_by_email(
    db: &DatabaseConnection,
    email: &str,
) -> Result<Option<UserModel>, DbErr> {
    UserEntity::find()
        .filter(UserColumn::Email.eq(email))
        .one(db)
        .await
}

/// 获取当前用户（假设只有一个本地用户）
pub async fn find_current(db: &DatabaseConnection) -> Result<Option<UserModel>, DbErr> {
    UserEntity::find()
        .order_by_desc(UserColumn::LastLogin)
        .one(db)
        .await
}

// ============================================================================
// 写入操作
// ============================================================================

/// 创建用户
#[allow(clippy::too_many_arguments)]
pub async fn create(
    db: &DatabaseConnection,
    id: String,
    username: String,
    display_name: Option<String>,
    avatar: Option<String>,
    email: Option<String>,
    plan: Option<UserPlan>,
    features: Option<UserFeatures>,
    settings: Option<UserSettings>,
) -> Result<UserModel, DbErr> {
    let now = chrono::Utc::now().timestamp_millis();

    let model = UserActiveModel {
        id: Set(id),
        username: Set(username),
        display_name: Set(display_name),
        avatar: Set(avatar),
        email: Set(email),
        last_login: Set(now),
        created_at: Set(now),
        plan: Set(plan.unwrap_or(UserPlan::Free)),
        plan_start_date: Set(None),
        plan_expires_at: Set(None),
        trial_expires_at: Set(None),
        token: Set(None),
        server_message: Set(None),
        features: Set(features.map(|f| serde_json::to_string(&f).unwrap_or_default())),
        state: Set(None),
        settings: Set(settings.map(|s| serde_json::to_string(&s).unwrap_or_default())),
    };

    model.insert(db).await
}

/// 更新用户
#[allow(clippy::too_many_arguments)]
pub async fn update(
    db: &DatabaseConnection,
    id: &str,
    username: Option<String>,
    display_name: Option<Option<String>>,
    avatar: Option<Option<String>>,
    email: Option<Option<String>>,
    last_login: Option<i64>,
    plan: Option<UserPlan>,
    plan_start_date: Option<Option<i64>>,
    plan_expires_at: Option<Option<i64>>,
    trial_expires_at: Option<Option<i64>>,
    token: Option<Option<String>>,
    server_message: Option<Option<String>>,
    features: Option<Option<UserFeatures>>,
    state: Option<Option<UserState>>,
    settings: Option<Option<UserSettings>>,
) -> Result<UserModel, DbErr> {
    let user = UserEntity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(DbErr::RecordNotFound(format!("User {} not found", id)))?;

    let mut model: UserActiveModel = user.into();

    if let Some(u) = username {
        model.username = Set(u);
    }
    if let Some(dn) = display_name {
        model.display_name = Set(dn);
    }
    if let Some(a) = avatar {
        model.avatar = Set(a);
    }
    if let Some(e) = email {
        model.email = Set(e);
    }
    if let Some(ll) = last_login {
        model.last_login = Set(ll);
    }
    if let Some(p) = plan {
        model.plan = Set(p);
    }
    if let Some(psd) = plan_start_date {
        model.plan_start_date = Set(psd);
    }
    if let Some(pea) = plan_expires_at {
        model.plan_expires_at = Set(pea);
    }
    if let Some(tea) = trial_expires_at {
        model.trial_expires_at = Set(tea);
    }
    if let Some(t) = token {
        model.token = Set(t);
    }
    if let Some(sm) = server_message {
        model.server_message = Set(sm);
    }
    if let Some(f) = features {
        model.features = Set(f.map(|feat| serde_json::to_string(&feat).unwrap_or_default()));
    }
    if let Some(st) = state {
        model.state = Set(st.map(|s| serde_json::to_string(&s).unwrap_or_default()));
    }
    if let Some(se) = settings {
        model.settings = Set(se.map(|s| serde_json::to_string(&s).unwrap_or_default()));
    }

    model.update(db).await
}

/// 更新最后登录时间
pub async fn update_last_login(db: &DatabaseConnection, id: &str) -> Result<UserModel, DbErr> {
    let now = chrono::Utc::now().timestamp_millis();
    update(
        db, id, None, None, None, None, Some(now), None, None, None, None, None, None, None, None,
        None,
    )
    .await
}

/// 更新用户状态
pub async fn update_state(
    db: &DatabaseConnection,
    id: &str,
    state: UserState,
) -> Result<UserModel, DbErr> {
    update(
        db,
        id,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        Some(Some(state)),
        None,
    )
    .await
}

/// 更新用户设置
pub async fn update_settings(
    db: &DatabaseConnection,
    id: &str,
    settings: UserSettings,
) -> Result<UserModel, DbErr> {
    update(
        db,
        id,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        Some(Some(settings)),
    )
    .await
}

/// 删除用户
pub async fn delete(db: &DatabaseConnection, id: &str) -> Result<(), DbErr> {
    UserEntity::delete_by_id(id).exec(db).await?;
    Ok(())
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::setup_test_db;

    #[tokio::test]
    async fn test_user_crud() {
        let db = setup_test_db().await;

        // 创建
        let user = create(
            &db,
            "user-1".into(),
            "testuser".into(),
            Some("Test User".into()),
            None,
            Some("test@example.com".into()),
            None,
            None,
            None,
        )
        .await
        .unwrap();

        assert_eq!(user.username, "testuser");
        assert_eq!(user.plan, UserPlan::Free);

        // 查询
        let found = find_by_id(&db, "user-1").await.unwrap();
        assert!(found.is_some());

        // 按用户名查询
        let by_username = find_by_username(&db, "testuser").await.unwrap();
        assert!(by_username.is_some());

        // 更新
        let updated = update(
            &db,
            "user-1",
            None,
            Some(Some("Updated Name".into())),
            None,
            None,
            None,
            Some(UserPlan::Premium),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        assert_eq!(updated.display_name, Some("Updated Name".into()));
        assert_eq!(updated.plan, UserPlan::Premium);

        // 删除
        delete(&db, "user-1").await.unwrap();
        let deleted = find_by_id(&db, "user-1").await.unwrap();
        assert!(deleted.is_none());
    }
}
