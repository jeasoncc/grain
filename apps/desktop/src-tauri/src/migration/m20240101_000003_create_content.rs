//! 创建 contents 表迁移

use sea_orm_migration::prelude::*;

use super::m20240101_000002_create_node::Nodes;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 contents 表
        manager
            .create_table(
                Table::create()
                    .table(Contents::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Contents::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Contents::NodeId)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Contents::Content).text().not_null())
                    .col(
                        ColumnDef::new(Contents::Version)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(Contents::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Contents::UpdatedAt).big_integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_content_node")
                            .from(Contents::Table, Contents::NodeId)
                            .to(Nodes::Table, Nodes::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // 创建节点索引
        manager
            .create_index(
                Index::create()
                    .name("idx_content_node")
                    .table(Contents::Table)
                    .col(Contents::NodeId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Contents::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Contents {
    #[iden = "contents"]
    Table,
    Id,
    NodeId,
    Content,
    Version,
    CreatedAt,
    UpdatedAt,
}
