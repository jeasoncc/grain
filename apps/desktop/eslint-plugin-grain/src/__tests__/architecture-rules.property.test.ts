/**
 * Property-Based Tests for Architecture Rules
 * 
 * Feature: eslint-plugin-enhancement
 * Property 3: Architecture Layer Dependency Validation
 * Property 4: Side Effect Detection in Pure Layers
 * Validates: Requirements 2.1-2.12, 3.1-3.10
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Linter } from 'eslint';
import plugin from '../index.js';

// Helper to run ESLint with our plugin and a specific filename
// Uses eslintrc config type because flat config has issues with filename matching
function runLintWithFilename(
  code: string, 
  rules: Record<string, string | [string, unknown]>,
  filename: string
): Linter.LintMessage[] {
  // Use legacy eslintrc config type for proper filename handling
  const linter = new Linter({ configType: 'eslintrc' });
  
  // Define rules from our plugin
  const ruleNames = Object.keys(rules);
  const ruleDefinitions: Record<string, unknown> = {};
  for (const ruleName of ruleNames) {
    const shortName = ruleName.replace('grain/', '');
    if (plugin.rules[shortName]) {
      ruleDefinitions[ruleName] = plugin.rules[shortName];
    }
  }
  linter.defineRules(ruleDefinitions);

  const config = {
    rules,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module' as const,
      ecmaFeatures: {
        jsx: true,
      },
    },
  };

  return linter.verify(code, config, { filename });
}

/**
 * Property 3: Architecture Layer Dependency Validation
 * 
 * For any import statement in a file within a known architecture layer,
 * if the import targets a layer not in the allowed dependencies list,
 * the ESLint plugin SHALL report an error with the correct layer dependency rules.
 * 
 * Validates: Requirements 2.1-2.12
 */
describe('Property 3: Architecture Layer Dependency Validation', () => {
  // Architecture layers
  const layers = ['views', 'hooks', 'flows', 'pipes', 'io', 'state', 'utils', 'types', 'queries', 'routes'] as const;
  type Layer = typeof layers[number];

  // Allowed dependencies for each layer (strict mode)
  const allowedDependencies: Record<Layer, Layer[]> = {
    views: ['hooks', 'types'],
    hooks: ['flows', 'state', 'queries', 'types'],
    flows: ['pipes', 'io', 'state', 'types'],
    pipes: ['utils', 'types'],
    io: ['types'],
    state: ['types'],
    utils: ['types'],
    types: [],
    queries: ['io', 'types'],
    routes: ['views', 'hooks', 'types'],
  };

  // Generate a filename for a given layer
  const generateFilename = (layer: Layer): string => {
    const filenames: Record<Layer, string> = {
      views: '/project/src/views/sidebar/sidebar.view.fn.tsx',
      hooks: '/project/src/hooks/use-workspace.ts',
      flows: '/project/src/flows/node/create-node.flow.ts',
      pipes: '/project/src/pipes/node/transform.pipe.ts',
      io: '/project/src/io/api/node.api.ts',
      state: '/project/src/state/selection.state.ts',
      utils: '/project/src/utils/date.util.ts',
      types: '/project/src/types/node.interface.ts',
      queries: '/project/src/queries/node.queries.ts',
      routes: '/project/src/routes/index.tsx',
    };
    return filenames[layer];
  };

  // Arbitrary for layer pairs
  const layerArb = fc.constantFrom(...layers);

  describe('layer dependency violations', () => {
    it('should detect violations when importing from disallowed layers', () => {
      fc.assert(
        fc.property(layerArb, layerArb, (currentLayer, importLayer) => {
          // Skip if import is allowed
          if (allowedDependencies[currentLayer].includes(importLayer)) {
            return true; // Skip this case
          }
          
          // Skip if importing from same layer (not a violation)
          if (currentLayer === importLayer) {
            return true;
          }

          const filename = generateFilename(currentLayer);
          const code = `import { something } from '@/${importLayer}/module';`;

          const errors = runLintWithFilename(
            code, 
            { 'grain/layer-dependencies': 'error' },
            filename
          );

          // Should have at least one error for layer violation
          const hasViolation = errors.some(e => e.ruleId === 'grain/layer-dependencies');
          expect(hasViolation).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should allow imports from allowed layers', () => {
      fc.assert(
        fc.property(layerArb, (currentLayer) => {
          const allowed = allowedDependencies[currentLayer];
          
          // Skip if no allowed dependencies
          if (allowed.length === 0) {
            return true;
          }

          // Pick a random allowed dependency
          const importLayer = allowed[Math.floor(Math.random() * allowed.length)];
          const filename = generateFilename(currentLayer);
          const code = `import { something } from '@/${importLayer}/module';`;

          const errors = runLintWithFilename(
            code, 
            { 'grain/layer-dependencies': 'error' },
            filename
          );

          // Should have no layer dependency errors
          const hasViolation = errors.some(e => e.ruleId === 'grain/layer-dependencies');
          expect(hasViolation).toBe(false);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('specific layer violations', () => {
    it('views/ should not import from flows/ directly', () => {
      fc.assert(
        fc.property(fc.boolean(), (_) => {
          const filename = '/project/src/views/sidebar/sidebar.view.fn.tsx';
          const code = `import { createNode } from '@/flows/node/create-node.flow';`;

          const errors = runLintWithFilename(
            code, 
            { 'grain/layer-dependencies': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/layer-dependencies')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('pipes/ should not import from io/', () => {
      fc.assert(
        fc.property(fc.boolean(), (_) => {
          const filename = '/project/src/pipes/node/transform.pipe.ts';
          const code = `import { nodeApi } from '@/io/api/node.api';`;

          const errors = runLintWithFilename(
            code, 
            { 'grain/layer-dependencies': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/layer-dependencies')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('pipes/ should not import from state/', () => {
      fc.assert(
        fc.property(fc.boolean(), (_) => {
          const filename = '/project/src/pipes/node/transform.pipe.ts';
          const code = `import { useSelectionStore } from '@/state/selection.state';`;

          const errors = runLintWithFilename(
            code, 
            { 'grain/layer-dependencies': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/layer-dependencies')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('utils/ should only import from types/', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('views', 'hooks', 'flows', 'pipes', 'io', 'state', 'queries', 'routes'),
          (importLayer) => {
            const filename = '/project/src/utils/date.util.ts';
            const code = `import { something } from '@/${importLayer}/module';`;

            const errors = runLintWithFilename(
              code, 
              { 'grain/layer-dependencies': 'error' },
              filename
            );

            expect(errors.some(e => e.ruleId === 'grain/layer-dependencies')).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('container component exceptions', () => {
    it('container components should be allowed to import from flows/', () => {
      fc.assert(
        fc.property(fc.boolean(), (_) => {
          const filename = '/project/src/views/sidebar/sidebar.container.fn.tsx';
          const code = `import { createNode } from '@/flows/node/create-node.flow';`;

          const errors = runLintWithFilename(
            code, 
            { 'grain/layer-dependencies': 'error' },
            filename
          );

          // Container components should be allowed to import from flows/
          expect(errors.some(e => e.ruleId === 'grain/layer-dependencies')).toBe(false);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('container components should be allowed to import from state/', () => {
      fc.assert(
        fc.property(fc.boolean(), (_) => {
          const filename = '/project/src/views/sidebar/sidebar.container.fn.tsx';
          const code = `import { useSelectionStore } from '@/state/selection.state';`;

          const errors = runLintWithFilename(
            code, 
            { 'grain/layer-dependencies': 'error' },
            filename
          );

          // Container components should be allowed to import from state/
          expect(errors.some(e => e.ruleId === 'grain/layer-dependencies')).toBe(false);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property 4: Side Effect Detection in Pure Layers
 * 
 * For any code in pipes/ or utils/ directories containing side effect globals
 * (console, fetch, localStorage, etc.), async functions, or Promise usage,
 * the ESLint plugin SHALL report an error.
 * 
 * Validates: Requirements 3.1-3.10
 */
describe('Property 4: Side Effect Detection in Pure Layers', () => {
  // Pure layers that should not have side effects
  const pureLayers = ['pipes', 'utils'] as const;
  type PureLayer = typeof pureLayers[number];

  // Generate a filename for a pure layer
  const generatePureFilename = (layer: PureLayer): string => {
    const filenames: Record<PureLayer, string> = {
      pipes: '/project/src/pipes/node/transform.pipe.ts',
      utils: '/project/src/utils/date.util.ts',
    };
    return filenames[layer];
  };

  // Side effect globals
  const sideEffectGlobals = [
    'console',
    'fetch',
    'localStorage',
    'sessionStorage',
    'document',
    'window',
    'setTimeout',
    'setInterval',
    'alert',
    'confirm',
    'prompt',
  ] as const;

  // Arbitrary for pure layers
  const pureLayerArb = fc.constantFrom(...pureLayers);

  // Arbitrary for side effect globals
  const sideEffectGlobalArb = fc.constantFrom(...sideEffectGlobals);

  describe('side effect global detection', () => {
    it('should detect console.* calls in pure layers', () => {
      fc.assert(
        fc.property(
          pureLayerArb,
          fc.constantFrom('log', 'error', 'warn', 'info', 'debug'),
          (layer, method) => {
            const filename = generatePureFilename(layer);
            const code = `
              export function transform(data) {
                console.${method}('Processing:', data);
                return data;
              }
            `;

            const errors = runLintWithFilename(
              code, 
              { 'grain/no-side-effects-in-pipes': 'error' },
              filename
            );

            expect(errors.some(e => e.ruleId === 'grain/no-side-effects-in-pipes')).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect fetch calls in pure layers', () => {
      fc.assert(
        fc.property(pureLayerArb, (layer) => {
          const filename = generatePureFilename(layer);
          const code = `
            export function getData(url) {
              return fetch(url);
            }
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-side-effects-in-pipes': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/no-side-effects-in-pipes')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should detect localStorage access in pure layers', () => {
      fc.assert(
        fc.property(pureLayerArb, (layer) => {
          const filename = generatePureFilename(layer);
          const code = `
            export function getSetting(key) {
              return localStorage.getItem(key);
            }
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-side-effects-in-pipes': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/no-side-effects-in-pipes')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should detect document access in pure layers', () => {
      fc.assert(
        fc.property(pureLayerArb, (layer) => {
          const filename = generatePureFilename(layer);
          const code = `
            export function getElement(id) {
              return document.getElementById(id);
            }
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-side-effects-in-pipes': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/no-side-effects-in-pipes')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should detect setTimeout/setInterval in pure layers', () => {
      fc.assert(
        fc.property(
          pureLayerArb,
          fc.constantFrom('setTimeout', 'setInterval'),
          (layer, timerFn) => {
            const filename = generatePureFilename(layer);
            const code = `
              export function delayedAction(callback) {
                ${timerFn}(callback, 1000);
              }
            `;

            const errors = runLintWithFilename(
              code, 
              { 'grain/no-side-effects-in-pipes': 'error' },
              filename
            );

            expect(errors.some(e => e.ruleId === 'grain/no-side-effects-in-pipes')).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('async detection in pure layers', () => {
    it('should detect async function declarations', () => {
      fc.assert(
        fc.property(pureLayerArb, (layer) => {
          const filename = generatePureFilename(layer);
          const code = `
            export async function fetchData(url) {
              const response = await fetch(url);
              return response.json();
            }
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-side-effects-in-pipes': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/no-side-effects-in-pipes')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should detect async arrow functions', () => {
      fc.assert(
        fc.property(pureLayerArb, (layer) => {
          const filename = generatePureFilename(layer);
          const code = `
            export const fetchData = async (url) => {
              const response = await fetch(url);
              return response.json();
            };
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-side-effects-in-pipes': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/no-side-effects-in-pipes')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should detect new Promise()', () => {
      fc.assert(
        fc.property(pureLayerArb, (layer) => {
          const filename = generatePureFilename(layer);
          const code = `
            export function createPromise() {
              return new Promise((resolve) => {
                resolve('done');
              });
            }
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-side-effects-in-pipes': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/no-side-effects-in-pipes')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('pure functions should pass', () => {
    it('should allow pure data transformations', () => {
      fc.assert(
        fc.property(pureLayerArb, (layer) => {
          const filename = generatePureFilename(layer);
          const code = `
            export function transform(data) {
              return {
                ...data,
                processed: true,
                timestamp: Date.now(),
              };
            }
            
            export function filter(items) {
              return items.filter(item => item.active);
            }
            
            export function map(items) {
              return items.map(item => ({ ...item, doubled: item.value * 2 }));
            }
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-side-effects-in-pipes': 'error' },
            filename
          );

          // Should have no side effect errors for pure functions
          expect(errors.filter(e => e.ruleId === 'grain/no-side-effects-in-pipes').length).toBe(0);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should allow fp-ts pipe operations', () => {
      fc.assert(
        fc.property(pureLayerArb, (layer) => {
          const filename = generatePureFilename(layer);
          const code = `
            import { pipe } from 'fp-ts/function';
            import * as A from 'fp-ts/Array';
            import * as O from 'fp-ts/Option';
            
            export const processItems = (items) =>
              pipe(
                items,
                A.filter(item => item.active),
                A.map(item => item.value),
                A.reduce(0, (acc, val) => acc + val)
              );
            
            export const findItem = (items, id) =>
              pipe(
                items,
                A.findFirst(item => item.id === id),
                O.map(item => item.name),
                O.getOrElse(() => 'Not found')
              );
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-side-effects-in-pipes': 'error' },
            filename
          );

          // Should have no side effect errors for fp-ts operations
          expect(errors.filter(e => e.ruleId === 'grain/no-side-effects-in-pipes').length).toBe(0);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('React detection in pure layers', () => {
    it('should detect React imports in pipes/', () => {
      fc.assert(
        fc.property(fc.boolean(), (_) => {
          const filename = '/project/src/pipes/node/transform.pipe.ts';
          const code = `
            import React from 'react';
            
            export function transform(data) {
              return data;
            }
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-react-in-pure-layers': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/no-react-in-pure-layers')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should detect React imports in utils/', () => {
      fc.assert(
        fc.property(fc.boolean(), (_) => {
          const filename = '/project/src/utils/helper.util.ts';
          const code = `
            import { useState } from 'react';
            
            export function helper() {
              return 'helper';
            }
          `;

          const errors = runLintWithFilename(
            code, 
            { 'grain/no-react-in-pure-layers': 'error' },
            filename
          );

          expect(errors.some(e => e.ruleId === 'grain/no-react-in-pure-layers')).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
