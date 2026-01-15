/**
 * Legacy Configuration Preset
 *
 * 用于迁移的宽松配置，仅在从旧代码库迁移到新架构时使用
 *
 * ⚠️ 警告：此配置仅用于迁移目的
 * - 不应在新项目中使用
 * - 应尽快迁移到 strict 配置
 * - 此配置将在未来版本中被移除
 *
 * 迁移策略：
 * 1. 使用 legacy 配置启动项目
 * 2. 逐步修复 warn 级别的问题
 * 3. 将规则逐个升级为 error
 * 4. 最终切换到 strict 配置
 *
 * Requirements: 14.5
 */

export const legacyConfig = {
	plugins: ["grain"],
	rules: {
		"grain/boolean-naming": "warn",
		"grain/chinese-comments": "off", // 语言偏好，关闭
		"grain/component-patterns": "warn",
		"grain/constant-naming": "warn",
		"grain/cyclomatic-complexity": "warn",
		"grain/file-location": "off", // 文件位置检查关闭，迁移成本高

		// ============================================
		// Naming Convention Rules - Relaxed
		// ============================================
		// 命名规则降级为 warn，不阻塞构建
		"grain/file-naming": "warn",
		"grain/fp-ts-patterns": "warn",
		"grain/function-naming": "warn",
		"grain/hooks-patterns": "warn",
		"grain/import-grouping": "off", // 纯格式化，关闭

		// ============================================
		// Architecture Layer Rules - Relaxed
		// ============================================
		// 架构规则降级为 warn，允许现有代码继续运行
		"grain/layer-dependencies": "warn",
		"grain/max-file-lines": "warn",

		// ============================================
		// Complexity Rules - Relaxed
		// ============================================
		// 复杂度规则降级为 warn，允许现有复杂代码
		"grain/max-function-lines": "warn",
		"grain/max-nesting": "warn",
		"grain/max-params": "warn",

		// ============================================
		// Type Safety Rules - Relaxed
		// ============================================
		// 类型安全规则降级为 warn
		"grain/no-any": "warn",
		"grain/no-async-outside-io": "off", // 完全关闭，迁移难度大

		// ============================================
		// Import Organization Rules - Partial
		// ============================================
		// 禁止的库保持 error（安全和性能关键）
		"grain/no-banned-imports": "error",
		"grain/no-commented-code": "warn",
		// 其他导入规则降级为 warn
		"grain/no-default-export": "warn",
		"grain/no-deprecated-imports": "error",

		// ============================================
		// Security Rules - Keep error
		// ============================================
		// 安全规则保持 error，不能妥协
		"grain/no-eval": "error",
		"grain/no-hardcoded-values": "warn",
		"grain/no-inline-functions": "warn",
		"grain/no-innerhtml": "error",

		// ============================================
		// Magic Values Rules - Relaxed
		// ============================================
		// 魔法值规则降级为 warn
		"grain/no-magic-numbers": "warn",
		"grain/no-mutation": "warn",

		// ============================================
		// Conditional Statement Rules - Relaxed
		// ============================================
		// 条件语句规则降级为 warn
		"grain/no-nested-ternary": "warn",
		"grain/no-non-null-assertion": "warn",
		"grain/no-object-mutation": "warn",
		"grain/no-promise-methods": "warn",
		"grain/no-react-in-pure-layers": "warn",
		"grain/no-sensitive-logging": "error",
		"grain/no-side-effects-in-pipes": "warn",
		"grain/no-store-in-views": "warn",
		"grain/no-throw": "warn",
		// ============================================
		// Functional Programming Rules - Relaxed
		// ============================================
		// 核心函数式规则降级为 warn，允许渐进式迁移
		"grain/no-try-catch": "warn",
		"grain/require-alias": "warn",
		"grain/require-callback": "warn",

		// ============================================
		// Documentation Rules - Relaxed
		// ============================================
		// 文档规则降级为 warn 或关闭
		"grain/require-jsdoc": "warn",

		// ============================================
		// React Component Rules - Relaxed
		// ============================================
		// React 规则降级为 warn，性能优化可以渐进
		"grain/require-memo": "warn",
		"grain/require-return-type": "off", // 类型推断足够，关闭
		"grain/require-switch-default": "warn",
		"grain/strict-equality": "error", // 保持 error，容易修复
		"grain/variable-naming": "warn",

		// ============================================
		// Zustand State Management Rules - Relaxed
		// ============================================
		"grain/zustand-patterns": "warn",
	},
} as const

/**
 * 迁移检查清单
 *
 * 使用此配置时，请定期检查以下项目：
 *
 * 1. [ ] 所有 try-catch 已迁移到 TaskEither
 * 2. [ ] 所有 throw 已替换为 Either.left
 * 3. [ ] 所有 Promise 方法已替换为 TaskEither
 * 4. [ ] 所有数组变异已替换为不可变操作
 * 5. [ ] 所有对象变异已替换为展开运算符
 * 6. [ ] 架构层级依赖已修复
 * 7. [ ] 纯函数层无副作用
 * 8. [ ] 文件命名符合规范
 * 9. [ ] 函数复杂度在限制内
 * 10. [ ] React 组件已优化（memo, useCallback）
 * 11. [ ] 导入已组织（分组、别名）
 * 12. [ ] 无安全漏洞（eval, innerHTML）
 * 13. [ ] 文档完整（JSDoc）
 * 14. [ ] 无魔法值
 * 15. [ ] 类型安全（无 any, 无非空断言）
 *
 * 当所有项目完成后，切换到 strict 配置
 */
