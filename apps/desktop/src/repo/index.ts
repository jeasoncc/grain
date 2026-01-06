/**
 * Repository 层 - 数据访问层
 *
 * @deprecated 请使用 @/io/api 代替
 * 此文件保留用于向后兼容
 *
 * 纯函数 + TaskEither 封装，返回前端类型。
 * 通过 Codec 层进行类型转换，确保前后端类型解耦。
 */

// Attachment Repository
export * as attachmentRepo from "./attachment.repo.fn";
export {
	addAttachment,
	createAttachment,
	deleteAttachment,
	deleteAttachmentsByProject,
	getAttachment,
	getAttachmentById,
	getAttachmentByIdOrNull,
	getAttachmentByPath,
	getAttachmentOrFail,
	getAttachments,
	getAttachmentsByProject,
	getAttachmentsByType,
	getAudioFilesByProject,
	getImagesByProject,
	updateAttachment,
} from "./attachment.repo.fn";
// Backup Repository (Rust 后端 SQLite 文件级备份)
export * as backupRepo from "./backup.repo.fn";
export {
	cleanupOldBackups,
	createBackup,
	deleteBackup,
	listBackups,
	restoreBackup,
} from "./backup.repo.fn";
// Clear Data Repository (Rust 后端 SQLite 清理 + 日志清理)
export * as clearDataRepo from "./clear-data.repo.fn";
export {
	clearAllData,
	clearAllDataKeepUsers,
	clearLogs,
	clearSqliteData,
	clearSqliteDataKeepUsers,
} from "./clear-data.repo.fn";
// Content Repository
export * as contentRepo from "./content.repo.fn";
export {
	addContent,
	createContent,
	getContentByNodeId,
	getContentByNodeIdOrFail,
	getContentsByNodeIds,
	getContentVersion,
	saveContent,
	updateContentByNodeId,
} from "./content.repo.fn";
// Node Repository
export * as nodeRepo from "./node.repo.fn";
// 也导出单独的函数，方便直接使用
export {
	addNode,
	createNode,
	deleteNode,
	deleteNodesBatch,
	duplicateNode,
	getAllNodes,
	getChildNodes,
	getDescendants,
	getNextOrder,
	getNextSortOrder,
	getNode,
	getNodeById,
	getNodeByIdOrFail,
	getNodeByIdOrNull,
	getNodesByParent,
	getNodesByType,
	getNodesByWorkspace,
	getRootNodes,
	moveNode,
	reorderNodes,
	setNodeCollapsed,
	updateNode,
} from "./node.repo.fn";
// Tag Repository
export * as tagRepo from "./tag.repo.fn";
export {
	addTag,
	createTag,
	decrementTagCount,
	deleteTag,
	deleteTagsByWorkspace,
	getNodesByTag,
	getOrCreateTag,
	getTag,
	getTagById,
	getTagByName,
	getTagGraphData,
	getTagOrFail,
	getTagsByWorkspace,
	getTopTags,
	incrementTagCount,
	rebuildTagCache,
	recalculateTagCounts,
	searchTags,
	syncTagCache,
	updateTag,
} from "./tag.repo.fn";
// User Repository
export * as userRepo from "./user.repo.fn";
export {
	addUser,
	createUser,
	deleteUser,
	getCurrentUser,
	getCurrentUserOrFail,
	getUser,
	getUserByEmail,
	getUserById,
	getUserByIdOrNull,
	getUserByUsername,
	getUserOrFail,
	getUsers,
	updateUser,
	updateUserLastLogin,
} from "./user.repo.fn";

// Workspace Repository
export * as workspaceRepo from "./workspace.repo.fn";
export {
	createWorkspace,
	deleteWorkspace,
	getAllWorkspaces,
	getWorkspace,
	getWorkspaceById,
	getWorkspaces,
	updateWorkspace,
} from "./workspace.repo.fn";
