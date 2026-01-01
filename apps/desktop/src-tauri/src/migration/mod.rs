//! 数据库迁移模块
//! 
//! 管理数据库结构的版本控制

pub use sea_orm_migration::prelude::*;

mod m20240101_000001_create_workspace;
mod m20240101_000002_create_node;
mod m20240101_000003_create_content;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20240101_000001_create_workspace::Migration),
            Box::new(m20240101_000002_create_node::Migration),
            Box::new(m20240101_000003_create_content::Migration),
        ]
    }
}
