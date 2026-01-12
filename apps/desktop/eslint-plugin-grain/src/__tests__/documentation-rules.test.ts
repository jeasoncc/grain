import { describe, it, expect } from 'vitest';
import plugin from '../index.js';

describe('Documentation Rules', () => {
  it('should export require-jsdoc rule', () => {
    expect(plugin.rules['require-jsdoc']).toBeDefined();
  });

  it('should export no-commented-code rule', () => {
    expect(plugin.rules['no-commented-code']).toBeDefined();
  });

  it('should export chinese-comments rule', () => {
    expect(plugin.rules['chinese-comments']).toBeDefined();
  });

  it('should include documentation rules in recommended config', () => {
    expect(plugin.configs.recommended.rules['grain/require-jsdoc']).toBe('error');
    expect(plugin.configs.recommended.rules['grain/no-commented-code']).toBe('error');
    expect(plugin.configs.recommended.rules['grain/chinese-comments']).toBe('warn');
  });

  it('should include documentation rules in strict config', () => {
    expect(plugin.configs.strict.rules['grain/require-jsdoc']).toBe('error');
    expect(plugin.configs.strict.rules['grain/no-commented-code']).toBe('error');
    expect(plugin.configs.strict.rules['grain/chinese-comments']).toBe('error');
  });
});
