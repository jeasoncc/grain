//! 创建 nodes 表迁移

use sea_orm_migration::prelude::*;

use super::m20240101_000001_create_workspace::Workspace;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 nodes 表
        manager
            .create_table(
                Table::create()
                    .table(Node::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Node::Id).string().not_null().primary_key())
                    .col(ColumnDef::new(Node::WorkspaceId).string().not_null())
                    .col(ColumnDef::new(Node::ParentId).string())
                    .col(ColumnDef::new(Node::Title).string().not_null())
                    .col(
                        ColumnDef::new(Node::NodeType)
                            .string()
                            .not_null()
                            .default("file"),
                    )
                    .col(
                        ColumnDef::new(Node::IsCollapsed)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Node::SortOrder)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(Node::Tags).text())
                    .col(ColumnDef::new(Node::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Node::UpdatedAt).big_integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_node_workspace")
                            .from(Node::Table, Node::WorkspaceId)
                            .to(Workspace::Table, Workspace::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // 创建工作区索引
        manager
            .create_index(
                Index::create()
                    .name("idx_node_workspace")
                    .table(Node::Table)
                    .col(Node::WorkspaceId)
                    .to_owned(),
            )
            .await?;

        // 创建父节点索引
        manager
            .create_index(
                Index::create()
                    .name("idx_node_parent")
                    .table(Node::Table)
                    .col(Node::ParentId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Node::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum Node {
    Table,
    Id,
    WorkspaceId,
    ParentId,
    Title,
    NodeType,
    IsCollapsed,
    SortOrder,
    Tags,
    CreatedAt,
    UpdatedAt,
}
