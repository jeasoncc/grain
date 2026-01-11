/**
 * Basic plugin infrastructure tests
 */

import { describe, it, expect } from 'vitest';
import plugin from '../index.js';

describe('ESLint Plugin Grain', () => {
  it('should export plugin with correct structure', () => {
    expect(plugin).toBeDefined();
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta.name).toBe('eslint-plugin-grain');
    expect(plugin.meta.version).toBe('1.0.0');
  });

  it('should have rules object', () => {
    expect(plugin.rules).toBeDefined();
    expect(typeof plugin.rules).toBe('object');
  });

  it('should have configs object', () => {
    expect(plugin.configs).toBeDefined();
    expect(plugin.configs.recommended).toBeDefined();
    expect(plugin.configs.strict).toBeDefined();
  });

  it('should export createRule utility', async () => {
    const { createRule } = await import('../index.js');
    expect(createRule).toBeDefined();
    expect(typeof createRule).toBe('function');
  });
});