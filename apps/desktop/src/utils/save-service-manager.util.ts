/**
 * @file utils/save-service-manager.util.ts
 * @description 兼容层 - 重导出 flows/save/save-service-manager.flow.ts
 *
 * 此文件保留用于向后兼容。
 * 实际实现已移动到 flows/save/save-service-manager.flow.ts
 *
 * @deprecated 请直接从 @/flows/save 导入
 */

export {
	createSaveServiceManager,
	type SaveModelConfig,
	saveServiceManager,
	type SaveServiceManagerInterface,
} from "@/flows/save/save-service-manager.flow";
