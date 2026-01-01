//! 创建 nodes 表迁移

use sea_orm_migration::prelude::*;

use super::m20240101_000001_create_workspace::Workspaces;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建 nodes 表
        manager
            .create_table(
                Table::create()
                    .table(Nodes::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Nodes::Id).string().not_null().primary_key())
                    .col(ColumnDef::new(Nodes::WorkspaceId).string().not_null())
                    .col(ColumnDef::new(Nodes::ParentId).string())
                    .col(ColumnDef::new(Nodes::Title).string().not_null())
                    .col(
                        ColumnDef::new(Nodes::NodeType)
                            .string()
                            .not_null()
                            .default("file"),
                    )
                    .col(
                        ColumnDef::new(Nodes::IsCollapsed)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Nodes::SortOrder)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(Nodes::Tags).text())
                    .col(ColumnDef::new(Nodes::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Nodes::UpdatedAt).big_integer().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_node_workspace")
                            .from(Nodes::Table, Nodes::WorkspaceId)
                            .to(Workspaces::Table, Workspaces::Id)
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
                    .table(Nodes::Table)
                    .col(Nodes::WorkspaceId)
                    .to_owned(),
            )
            .await?;

        // 创建父节点索引
        manager
            .create_index(
                Index::create()
                    .name("idx_node_parent")
                    .table(Nodes::Table)
                    .col(Nodes::ParentId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Nodes::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
pub enum Nodes {
    #[iden = "nodes"]
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
