//! Tag 类型模块
//!
//! 包含标签相关的所有类型定义

mod tag_entity;
mod tag_interface;

pub use tag_entity::{
    ActiveModel as TagActiveModel, Column as TagColumn, Entity as TagEntity, Model as TagModel,
};
pub use tag_interface::{
    CreateTagRequest, TagGraphData, TagGraphEdge, TagGraphNode, TagResponse, UpdateTagRequest,
};
