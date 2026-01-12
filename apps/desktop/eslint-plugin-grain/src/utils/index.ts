/**
 * 工具函数导出
 * Utility functions exports for ESLint plugin
 */

// 架构层级工具
export {
  getArchitectureLayer,
  isContainerComponent,
  isViewComponent,
  isTestFile,
  getImportLayer,
  getAllowedDependencies,
  getContainerExtraDependencies,
  isLayerViolation,
  getLayerViolationDetails,
  isDeprecatedDirectoryImport,
  getDeprecatedDirectoryMigration,
  isExternalImport,
  isInternalImport,
  isRelativeImport,
  isAliasImport,
  getRelativeImportDepth,
  isRelativeImportTooDeep,
  getExpectedTestFilePath,
  isFileInCorrectDirectory,
  getSuggestedDirectory,
  isIndexFilePattern,
  getLayerChineseName,
  getLayerDescription,
} from './architecture.js';

// 消息构建器
export {
  buildErrorMessage,
  buildWarningMessage,
  buildComprehensiveErrorMessage,
  buildShortErrorMessage,
  buildShortWarningMessage,
  buildSuggestionMessage,
  getImmutableArrayAlternative,
  getLayerViolationSuggestion,
  getTaskEitherMigrationExample,
  getOptionMigrationExample,
} from './message-builder.js';

// AST 辅助函数
export {
  isMethodCall,
  isGlobalIdentifier,
  isMemberMethodCall,
  getMemberMethodName,
  getMemberObjectName,
  isAsyncFunction,
  isInsideAsyncFunction,
  getCallExpressionDepth,
  isTryCatchStatement,
  isThrowStatement,
  isAwaitExpression,
  isNewPromise,
  isPromiseMethodCall,
  isAssignmentExpression,
  isObjectPropertyAssignment,
  isArrayIndexAssignment,
  getFunctionParamCount,
  getFunctionLineCount,
  getNestingDepth,
  isJSXElement,
  isInsideJSXAttribute,
  getImportSource,
  hasDefaultImport,
  hasNamedImports,
  getNamedImports,
  isConsoleCall,
  getConsoleMethodName,
  isEvalCall,
  isFunctionConstructor,
  isInnerHTMLAssignment,
  isDangerouslySetInnerHTML,
  getFunctionName,
  isReactFunctionComponent,
  isInTestFile,
} from './ast-helpers.js';

// 命名检查辅助
export {
  isValidVariableLength,
  startsWithVerb,
  hasValidBooleanPrefix,
  hasValidEventHandlerPrefix,
  isScreamingSnakeCase,
  isCamelCase,
  isPascalCase,
  isKebabCase,
  isSnakeCase,
  isPrivateName,
  isValidHookName,
  isValidComponentName,
  isValidTypeName,
  camelToKebab,
  kebabToCamel,
  snakeToCamel,
  camelToScreamingSnake,
  suggestBooleanName,
  suggestEventHandlerName,
  suggestConstantName,
  isValidFileName,
  isValidDirectoryName,
  getVariableNameIssue,
  getFunctionNameIssue,
  getBooleanNameIssue,
  getConstantNameIssue,
  getEventHandlerNameIssue,
} from './naming-helpers.js';

// 重导出类型和配置
export * from '../types/index.js';
