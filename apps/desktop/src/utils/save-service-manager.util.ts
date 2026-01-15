/**
 * @file utils/save-service-manager.util.ts
 * @description 兼容层说明
 *
 * 此文件已废弃。
 * 实际实现已移动到 flows/save/save-service-manager.flow.ts
 *
 * @deprecated 请直接从 @/flows/save 导入
 */

// 为避免反向依赖（utils 不应依赖 flows），不再从 flows 重导出
// 请直接使用: import { saveServiceManager } from "@/flows/save";

export {}
