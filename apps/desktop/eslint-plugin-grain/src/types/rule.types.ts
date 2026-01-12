/**
 * 规则相关类型定义
 * Rule-related type definitions for ESLint plugin
 */

/**
 * 规则严重级别
 */
export type RuleSeverity = 'error' | 'warn' | 'off';

/**
 * 错误消息结构
 */
export interface RuleMessage {
  /** 消息 ID */
  id: string;
  /** 主要错误描述（中文） */
  description: string;
  /** 问题原因说明 */
  reason: string;
  /** 正确做法示例 */
  correctExample: string;
  /** 错误做法示例 */
  incorrectExample?: string;
  /** 相关文档链接 */
  docUrl?: string;
  /** 严重级别图标 */
  icon: '❌' | '⚠️' | '💡';
}

/**
 * 架构层级
 */
export type ArchitectureLayer =
  | 'views'
  | 'hooks'
  | 'flows'
  | 'pipes'
  | 'io'
  | 'state'
  | 'utils'
  | 'types'
  | 'queries'
  | 'routes';

/**
 * 层级依赖配置
 */
export interface LayerDependencyConfig {
  layer: ArchitectureLayer;
  allowedDependencies: ArchitectureLayer[];
  exceptions?: {
    file: string;
    allowedExtra: ArchitectureLayer[];
  }[];
}

/**
 * 文件命名模式
 */
export interface FileNamingPattern {
  layer: ArchitectureLayer | string;
  pattern: RegExp;
  description: string;
  example: string;
}

/**
 * 错误消息构建配置
 */
export interface ErrorMessageConfig {
  /** 错误标题 */
  title: string;
  /** 错误原因 */
  reason: string;
  /** 正确做法示例代码 */
  correctExample: string;
  /** 错误做法示例代码 */
  incorrectExample?: string;
  /** 文档引用 */
  docRef?: string;
  /** steering 文件引用 */
  steeringFile?: string;
  /** 相关规则 */
  relatedRules?: string[];
}

/**
 * 警告消息构建配置
 */
export interface WarningMessageConfig {
  /** 警告标题 */
  title: string;
  /** 建议内容 */
  suggestion: string;
  /** 示例代码 */
  example?: string;
}

/**
 * 完整错误消息配置（包含架构原则）
 */
export interface ComprehensiveErrorConfig extends ErrorMessageConfig {
  /** 问题代码 */
  problemCode?: string;
  /** 架构原则说明 */
  architecturePrinciple?: string;
  /** 修复步骤 */
  steps?: string[];
  /** 注意事项 */
  warnings?: string[];
}

/**
 * 规则元数据
 */
export interface RuleMetadata {
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 规则类别 */
  category: RuleCategory;
  /** 是否可自动修复 */
  fixable: boolean;
  /** 默认严重级别 */
  defaultSeverity: RuleSeverity;
  /** 相关需求 */
  requirements: string[];
}

/**
 * 规则类别
 */
export type RuleCategory =
  | 'functional'
  | 'architecture'
  | 'naming'
  | 'complexity'
  | 'react'
  | 'imports'
  | 'security'
  | 'documentation'
  | 'magic-values'
  | 'type-safety'
  | 'zustand';
