/**
 * @file index.ts
 * @description 更新检查组件统一导出
 */

export {
	UpdateCheckerContainer,
	UpdateCheckerContainer as UpdateChecker,
} from "./update-checker.container.fn";
export type {
	CheckStatus,
	UpdateCheckerViewProps,
} from "./update-checker.types";
export { UpdateCheckerView } from "./update-checker.view.fn";
