//! 创建 contents 表迁移

use sea_orm_migration::prelude::*;

use super::m20240101_000002_create_node::Node;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 contents 表
        manager
            .create_table(
                Table::create()
                    .table(Content::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Content::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Content::NodeId)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Content::Content).text().not_null())
                    .col(
                        ColumnDef::new(Content::Version)
                            .integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(Content::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Content::UpdatedAt).big_integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_content_node")
                            .from(Content::Table, Content::NodeId)
                            .to(Node::Table, Node::Id)
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
                    .table(Content::Table)
                    .col(Content::NodeId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Content::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Content {
    Table,
    Id,
    NodeId,
    Content,
    Version,
    CreatedAt,
    UpdatedAt,
}
