//! Attachment 类型模块
//!
//! 包含附件相关的所有类型定义

mod attachment_entity;
mod attachment_interface;

pub use attachment_entity::{ActiveModel as AttachmentActiveModel, AttachmentType, Column as AttachmentColumn, Entity as AttachmentEntity, Model as AttachmentModel};
pub use attachment_interface::{AttachmentResponse, CreateAttachmentRequest, UpdateAttachmentRequest};
