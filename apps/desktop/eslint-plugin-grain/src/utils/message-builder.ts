/**
 * 错误消息构建器
 * Unified error message builder for ESLint rules
 *
 * 设计目标：让 AI 和开发者都能立即理解问题并知道如何修复
 */

import type {
	ComprehensiveErrorConfig,
	ErrorMessageConfig,
	WarningMessageConfig,
} from "../types/rule.types.js"

/**
 * 构建标准化的错误消息
 * 所有规则必须使用此函数生成消息，确保格式一致
 */
export function buildErrorMessage(config: ErrorMessageConfig): string {
	const lines = [
		`❌ ${config.title}`,
		"",
		`🔍 原因：`,
		`  ${config.reason}`,
		"",
		`✅ 正确做法：`,
		...config.correctExample.split("\n").map((line) => `  ${line}`),
	]

	if (config.incorrectExample) {
		lines.push(
			"",
			`❌ 错误做法：`,
			...config.incorrectExample.split("\n").map((line) => `  ${line}`),
		)
	}

	if (config.docRef) {
		lines.push("", `📚 参考文档：${config.docRef}`)
	}

	if (config.steeringFile) {
		lines.push(`📋 Steering 文件：${config.steeringFile}`)
	}

	if (config.relatedRules && config.relatedRules.length > 0) {
		lines.push("", `🔗 相关规则：${config.relatedRules.join(", ")}`)
	}

	return lines.join("\n")
}

/**
 * 构建警告消息
 */
export function buildWarningMessage(config: WarningMessageConfig): string {
	const lines = [`⚠️ ${config.title}`, "", `💡 建议：`, `  ${config.suggestion}`]

	if (config.example) {
		lines.push("", `示例：`, ...config.example.split("\n").map((line) => `  ${line}`))
	}

	return lines.join("\n")
}

/**
 * 构建完整的错误消息（包含架构原则和修复步骤）
 * 用于复杂的架构违规错误
 */
export function buildComprehensiveErrorMessage(config: ComprehensiveErrorConfig): string {
	const lines = [`❌ 【错误】${config.title}`, ""]

	if (config.problemCode) {
		lines.push(`📝 问题代码：`, ...config.problemCode.split("\n").map((line) => `  ${line}`), "")
	}

	lines.push(`🔍 错误原因：`, `  ${config.reason}`, "")

	if (config.architecturePrinciple) {
		lines.push(
			`🏗️ 架构原则：`,
			...config.architecturePrinciple.split("\n").map((line) => `  ${line}`),
			"",
		)
	}

	if (config.steps && config.steps.length > 0) {
		lines.push(`✅ 修复方案：`)
		config.steps.forEach((step, index) => {
			lines.push(`  步骤 ${index + 1}: ${step}`)
		})
		lines.push("")
	}

	lines.push(`📋 修复后的代码：`, "```typescript", ...config.correctExample.split("\n"), "```", "")

	if (config.warnings && config.warnings.length > 0) {
		lines.push(`⚠️ 注意事项：`)
		config.warnings.forEach((warning) => {
			lines.push(`  - ${warning}`)
		})
		lines.push("")
	}

	if (config.docRef) {
		lines.push(`📚 参考文档：${config.docRef}`)
	}

	if (config.steeringFile) {
		lines.push(`📋 Steering 文件：${config.steeringFile}`)
	}

	if (config.relatedRules && config.relatedRules.length > 0) {
		lines.push("", `🔗 相关规则：${config.relatedRules.join(", ")}`)
	}

	return lines.join("\n")
}

/**
 * 构建简短的错误消息（用于 ESLint 报告）
 */
export function buildShortErrorMessage(title: string, suggestion: string): string {
	return `❌ ${title}。${suggestion}`
}

/**
 * 构建简短的警告消息
 */
export function buildShortWarningMessage(title: string, suggestion: string): string {
	return `⚠️ ${title}。${suggestion}`
}

/**
 * 构建建议消息
 */
export function buildSuggestionMessage(title: string, suggestion: string): string {
	return `💡 ${title}。${suggestion}`
}

/**
 * 获取数组变异方法的不可变替代方案
 */
export function getImmutableArrayAlternative(method: string, arrayName: string): string {
	const alternatives: Record<string, string> = {
		copyWithin: `// 使用 slice 和 spread 创建新数组
const newArray = [...${arrayName}];`,
		fill: `// 填充（创建新数组）
const filled = ${arrayName}.map(() => fillValue);`,
		pop: `// 移除最后一个元素
const newArray = ${arrayName}.slice(0, -1);
// 获取最后一个元素
const lastItem = ${arrayName}[${arrayName}.length - 1];`,
		push: `// 添加元素到末尾
const newArray = [...${arrayName}, newItem];
// 添加多个元素
const newArray = [...${arrayName}, item1, item2];`,
		reverse: `// 反转（不修改原数组）
const reversed = [...${arrayName}].reverse();`,
		shift: `// 移除第一个元素
const newArray = ${arrayName}.slice(1);
// 获取第一个元素
const firstItem = ${arrayName}[0];`,
		sort: `// 排序（不修改原数组）
const sorted = [...${arrayName}].sort((a, b) => a.name.localeCompare(b.name));
// 使用 fp-ts
import * as A from 'fp-ts/Array';
const sorted = pipe(${arrayName}, A.sort(Ord));`,
		splice: `// 删除元素
const newArray = ${arrayName}.filter((_, index) => index !== targetIndex);
// 插入元素
const newArray = [
  ...${arrayName}.slice(0, insertIndex),
  newItem,
  ...${arrayName}.slice(insertIndex)
];`,
		unshift: `// 添加元素到开头
const newArray = [newItem, ...${arrayName}];`,
	}
	return alternatives[method] || `const newArray = [...${arrayName}];`
}

/**
 * 获取层级违规的修复建议
 */
export function getLayerViolationSuggestion(currentLayer: string, importLayer: string): string {
	const suggestions: Record<string, Record<string, string>> = {
		hooks: {
			io: `// hooks/ 不能直接导入 io/
// 方案: 通过 flows/ 间接访问
// 或使用 queries/ (TanStack Query)`,
		},
		pipes: {
			flows: `// pipes/ 不能导入 flows/
// 方案: pipes 只能依赖 utils/ 和 types/`,
			io: `// pipes/ 不能导入 io/（pipes 必须是纯函数）
// 方案: 将 IO 操作移动到 flows/ 层
// flows/ 负责组合 pipes/ 和 io/`,
			state: `// pipes/ 不能导入 state/（pipes 必须是纯函数）
// 方案: 将状态作为参数传入
const transform = (node: Node, settings: Settings) => {
  return { ...node, ...settings };
};`,
		},
		views: {
			flows: `// views/ 不能直接导入 flows/
// 方案: 使用 hooks 封装
// 在 hooks/ 中创建 hook
import { useCreateNode } from '@/hooks/use-create-node';
const { mutate } = useCreateNode();`,
			io: `// views/ 不能直接导入 io/
// 方案: 通过 hooks/ 和 flows/ 间接访问
// 数据流: views/ → hooks/ → flows/ → io/`,
			pipes: `// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层`,
			state: `// views/ 不能直接导入 state/
// 方案: 通过 hooks/ 访问状态
import { useSelectionState } from '@/hooks/use-selection';`,
		},
	}

	return (
		suggestions[currentLayer]?.[importLayer] ||
		`// 请检查架构文档，确定正确的依赖路径
// ${currentLayer}/ 不能依赖 ${importLayer}/`
	)
}

/**
 * 获取 TaskEither 迁移示例
 */
export function getTaskEitherMigrationExample(): string {
	return `import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as T from 'fp-ts/Task';
import { AppError } from '@/types/error.types';

// 将 try-catch 替换为 TE.tryCatch
const fetchDataSafe = (): TE.TaskEither<AppError, Data> =>
  TE.tryCatch(
    () => fetchData(),
    (error): AppError => ({
      type: 'FETCH_ERROR',
      message: \`获取数据失败: \${String(error)}\`,
      cause: error,
    })
  );

// 使用 pipe 组合操作
pipe(
  fetchDataSafe(),
  TE.fold(
    (error) => T.of(logger.error('[Module] 获取失败', error)),
    (data) => T.of(processData(data))
  )
)();`
}

/**
 * 获取 Option 迁移示例
 */
export function getOptionMigrationExample(): string {
	return `import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';

// 将 null 检查替换为 Option
const getValue = (obj: { value?: string }): O.Option<string> =>
  O.fromNullable(obj.value);

// 使用 pipe 处理 Option
pipe(
  getValue(obj),
  O.map(value => value.toUpperCase()),
  O.getOrElse(() => 'default')
);`
}
