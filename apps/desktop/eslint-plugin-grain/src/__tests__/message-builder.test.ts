/**
 * Message Builder 单元测试
 * Tests for message-builder utility functions
 */

import { describe, it, expect } from 'vitest';
import {
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
} from '../utils/message-builder.js';

describe('buildErrorMessage', () => {
  it('should build basic error message with title and reason', () => {
    const message = buildErrorMessage({
      title: '禁止使用 try-catch',
      reason: 'try-catch 隐藏了错误类型信息',
      correctExample: 'const result = TE.tryCatch(() => fetchData(), toAppError);',
    });

    expect(message).toContain('❌ 禁止使用 try-catch');
    expect(message).toContain('🔍 原因：');
    expect(message).toContain('try-catch 隐藏了错误类型信息');
    expect(message).toContain('✅ 正确做法：');
    expect(message).toContain('TE.tryCatch');
  });

  it('should include incorrect example when provided', () => {
    const message = buildErrorMessage({
      title: '禁止数组变异',
      reason: '数组变异破坏不可变性',
      correctExample: 'const newArr = [...arr, item];',
      incorrectExample: 'arr.push(item);',
    });

    expect(message).toContain('❌ 错误做法：');
    expect(message).toContain('arr.push(item)');
  });

  it('should include doc reference when provided', () => {
    const message = buildErrorMessage({
      title: '测试错误',
      reason: '测试原因',
      correctExample: '正确代码',
      docRef: 'https://example.com/docs',
    });

    expect(message).toContain('📚 参考文档：https://example.com/docs');
  });

  it('should include steering file reference when provided', () => {
    const message = buildErrorMessage({
      title: '测试错误',
      reason: '测试原因',
      correctExample: '正确代码',
      steeringFile: '#fp-patterns',
    });

    expect(message).toContain('📋 Steering 文件：#fp-patterns');
  });

  it('should include related rules when provided', () => {
    const message = buildErrorMessage({
      title: '测试错误',
      reason: '测试原因',
      correctExample: '正确代码',
      relatedRules: ['no-throw', 'no-promise-catch'],
    });

    expect(message).toContain('🔗 相关规则：no-throw, no-promise-catch');
  });
});

describe('buildWarningMessage', () => {
  it('should build warning message with title and suggestion', () => {
    const message = buildWarningMessage({
      title: '建议使用 memo',
      suggestion: '使用 React.memo 包裹组件以优化性能',
    });

    expect(message).toContain('⚠️ 建议使用 memo');
    expect(message).toContain('💡 建议：');
    expect(message).toContain('使用 React.memo 包裹组件');
  });

  it('should include example when provided', () => {
    const message = buildWarningMessage({
      title: '建议使用 memo',
      suggestion: '使用 React.memo 包裹组件',
      example: 'export const MyComponent = memo(({ props }) => <div />);',
    });

    expect(message).toContain('示例：');
    expect(message).toContain('React.memo');
  });
});

describe('buildComprehensiveErrorMessage', () => {
  it('should build comprehensive error message with all sections', () => {
    const message = buildComprehensiveErrorMessage({
      title: '架构层级违规',
      problemCode: "import { api } from '@/io/api';",
      reason: 'views 层不能直接导入 io 层',
      architecturePrinciple: 'views/ → hooks/ → flows/ → io/',
      steps: ['创建 hook 封装', '在 hook 中调用 flow', '在 view 中使用 hook'],
      correctExample: "import { useData } from '@/hooks/use-data';",
      warnings: ['不要绕过架构规则'],
      docRef: '#architecture',
      steeringFile: '#structure',
      relatedRules: ['layer-dependencies'],
    });

    expect(message).toContain('❌ 【错误】架构层级违规');
    expect(message).toContain('📝 问题代码：');
    expect(message).toContain('🔍 错误原因：');
    expect(message).toContain('🏗️ 架构原则：');
    expect(message).toContain('✅ 修复方案：');
    expect(message).toContain('步骤 1:');
    expect(message).toContain('步骤 2:');
    expect(message).toContain('步骤 3:');
    expect(message).toContain('📋 修复后的代码：');
    expect(message).toContain('⚠️ 注意事项：');
    expect(message).toContain('📚 参考文档：');
    expect(message).toContain('📋 Steering 文件：');
    expect(message).toContain('🔗 相关规则：');
  });
});

describe('buildShortErrorMessage', () => {
  it('should build short error message', () => {
    const message = buildShortErrorMessage('禁止使用 try-catch', '使用 TaskEither 替代');
    expect(message).toBe('❌ 禁止使用 try-catch。使用 TaskEither 替代');
  });
});

describe('buildShortWarningMessage', () => {
  it('should build short warning message', () => {
    const message = buildShortWarningMessage('建议使用 memo', '优化组件性能');
    expect(message).toBe('⚠️ 建议使用 memo。优化组件性能');
  });
});

describe('buildSuggestionMessage', () => {
  it('should build suggestion message', () => {
    const message = buildSuggestionMessage('可以使用 pipe', '组合多个函数');
    expect(message).toBe('💡 可以使用 pipe。组合多个函数');
  });
});

describe('getImmutableArrayAlternative', () => {
  it('should return push alternative', () => {
    const alt = getImmutableArrayAlternative('push', 'items');
    expect(alt).toContain('const newArray = [...items, newItem]');
  });

  it('should return pop alternative', () => {
    const alt = getImmutableArrayAlternative('pop', 'items');
    expect(alt).toContain('items.slice(0, -1)');
  });

  it('should return shift alternative', () => {
    const alt = getImmutableArrayAlternative('shift', 'items');
    expect(alt).toContain('items.slice(1)');
  });

  it('should return unshift alternative', () => {
    const alt = getImmutableArrayAlternative('unshift', 'items');
    expect(alt).toContain('[newItem, ...items]');
  });

  it('should return splice alternative', () => {
    const alt = getImmutableArrayAlternative('splice', 'items');
    expect(alt).toContain('filter');
    expect(alt).toContain('slice');
  });

  it('should return sort alternative', () => {
    const alt = getImmutableArrayAlternative('sort', 'items');
    expect(alt).toContain('[...items].sort');
  });

  it('should return reverse alternative', () => {
    const alt = getImmutableArrayAlternative('reverse', 'items');
    expect(alt).toContain('[...items].reverse()');
  });

  it('should return default alternative for unknown method', () => {
    const alt = getImmutableArrayAlternative('unknown', 'items');
    expect(alt).toContain('[...items]');
  });
});

describe('getLayerViolationSuggestion', () => {
  it('should return suggestion for views -> flows violation', () => {
    const suggestion = getLayerViolationSuggestion('views', 'flows');
    expect(suggestion).toContain('views/ 不能直接导入 flows/');
    expect(suggestion).toContain('hooks');
  });

  it('should return suggestion for views -> io violation', () => {
    const suggestion = getLayerViolationSuggestion('views', 'io');
    expect(suggestion).toContain('views/ 不能直接导入 io/');
  });

  it('should return suggestion for pipes -> io violation', () => {
    const suggestion = getLayerViolationSuggestion('pipes', 'io');
    expect(suggestion).toContain('pipes/ 不能导入 io/');
    expect(suggestion).toContain('纯函数');
  });

  it('should return suggestion for pipes -> state violation', () => {
    const suggestion = getLayerViolationSuggestion('pipes', 'state');
    expect(suggestion).toContain('pipes/ 不能导入 state/');
  });

  it('should return generic suggestion for unknown violation', () => {
    const suggestion = getLayerViolationSuggestion('unknown', 'other');
    expect(suggestion).toContain('不能依赖');
  });
});

describe('getTaskEitherMigrationExample', () => {
  it('should return TaskEither migration example', () => {
    const example = getTaskEitherMigrationExample();
    expect(example).toContain('TE.tryCatch');
    expect(example).toContain('TaskEither');
    expect(example).toContain('AppError');
    expect(example).toContain('pipe');
    expect(example).toContain('TE.fold');
  });
});

describe('getOptionMigrationExample', () => {
  it('should return Option migration example', () => {
    const example = getOptionMigrationExample();
    expect(example).toContain('O.fromNullable');
    expect(example).toContain('Option');
    expect(example).toContain('pipe');
    expect(example).toContain('O.map');
    expect(example).toContain('O.getOrElse');
  });
});
