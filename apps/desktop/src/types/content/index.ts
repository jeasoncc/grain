/**
 * @file types/content/index.ts
 * @description Content 类型模块统一导出
 *
 * Read-only historical content projection types. Exact recovery metadata is decoded
 * separately by the migration codec; there are no historical body-write inputs.
 *
 * @requirements 2.1
 */

// 接口类型
export type {
	ContentInterface,
	ContentType,
} from "./content.interface"

