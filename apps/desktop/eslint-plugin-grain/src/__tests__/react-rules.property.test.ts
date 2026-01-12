/**
 * Property-Based Tests for React Rules
 * 
 * Feature: eslint-plugin-enhancement
 * Property 7: React Component Pattern Enforcement
 * Validates: Requirements 6.1-6.7, 21.1-21.7, 25.1-25.6
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { runLint, hasRuleError, countRuleErrors } from './test-utils.js';

describe('Property 7: React Component Pattern Enforcement', () => {

  describe('require-memo rule', () => {
    it('should detect components without memo wrapper', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Button', 'Input', 'Card', 'List', 'Item'),
          (componentName) => {
            const code = `
              export const ${componentName} = () => {
                return <div>Hello</div>;
              };
            `;

            const errors = runLint(
              code,
              { 'grain/require-memo': 'error' },
              '/src/views/test.view.fn.tsx'
            );

            expect(errors.length).toBeGreaterThan(0);
            expect(hasRuleError(errors, 'grain/require-memo')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow components with memo wrapper', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Button', 'Input', 'Card', 'List', 'Item'),
          (componentName) => {
            const code = `
              import { memo } from 'react';
              export const ${componentName} = memo(() => {
                return <div>Hello</div>;
              });
            `;

            const errors = runLint(
              code,
              { 'grain/require-memo': 'error' },
              '/src/views/test.view.fn.tsx'
            );

            // Should have no errors for memoized components
            expect(countRuleErrors(errors, 'grain/require-memo')).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('no-inline-functions rule', () => {
    it('should detect inline arrow functions in JSX props', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur'),
          fc.constantFrom('doSomething', 'handleEvent', 'processData'),
          (propName, functionName) => {
            const code = `
              const Component = () => {
                return <button ${propName}={() => ${functionName}()}>Click</button>;
              };
            `;

            const errors = runLint(code, { 'grain/no-inline-functions': 'error' });

            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.ruleId === 'grain/no-inline-functions')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect inline function expressions in JSX props', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onClick', 'onChange', 'onSubmit'),
          (propName) => {
            const code = `
              const Component = () => {
                return <button ${propName}={function() { doSomething(); }}>Click</button>;
              };
            `;

            const errors = runLint(code, { 'grain/no-inline-functions': 'error' });

            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.ruleId === 'grain/no-inline-functions')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('hooks-patterns rule', () => {
    it('should detect conditional hook calls', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('useState', 'useEffect', 'useCallback', 'useMemo'),
          (hookName) => {
            const code = `
              const Component = () => {
                if (condition) {
                  const value = ${hookName}();
                }
                return <div>Test</div>;
              };
            `;

            const errors = runLint(code, { 'grain/hooks-patterns': 'error' });

            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.ruleId === 'grain/hooks-patterns')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect useEffect with empty deps without comment', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('initApp', 'setupListeners', 'loadData'),
          (functionName) => {
            const code = `
              const Component = () => {
                useEffect(() => {
                  ${functionName}();
                }, []);
                return <div>Test</div>;
              };
            `;

            const errors = runLint(code, { 'grain/hooks-patterns': 'error' });

            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.ruleId === 'grain/hooks-patterns')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('component-patterns rule', () => {
    it('should detect key={index} usage', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('index', 'i', 'idx'),
          fc.constantFrom('Item', 'Card', 'Row'),
          (indexName, componentName) => {
            const code = `
              const List = () => {
                return items.map((item, ${indexName}) => (
                  <${componentName} key={${indexName}} data={item} />
                ));
              };
            `;

            const errors = runLint(code, { 'grain/component-patterns': 'error' });

            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.ruleId === 'grain/component-patterns')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect conditional rendering with && for numeric values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('count', 'length', 'size', 'total', 'numItems'),
          (varName) => {
            const code = `
              const Component = () => {
                return <div>{${varName} && <span>{${varName}} items</span>}</div>;
              };
            `;

            const errors = runLint(code, { 'grain/component-patterns': 'error' });

            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.ruleId === 'grain/component-patterns')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect business state hooks in view components', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('useWorkspace', 'useNode', 'useContent', 'useUser', 'useQuery'),
          (hookName) => {
            const code = `
              export const TestView = () => {
                const data = ${hookName}();
                return <div>{data}</div>;
              };
            `;

            const errors = runLint(
              code,
              { 'grain/component-patterns': 'error' },
              '/src/views/test.view.fn.tsx'
            );

            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.ruleId === 'grain/component-patterns')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Integration: Multiple React patterns', () => {
    it('should detect multiple violations in a single component', () => {
      const code = `
        export const BadComponent = () => {
          const data = useWorkspace();
          
          useEffect(() => {
            loadData();
          }, []);
          
          return (
            <div>
              {items.map((item, index) => (
                <Item 
                  key={index}
                  onClick={() => handleClick(item)}
                  data={item}
                />
              ))}
              {count && <div>{count} items</div>}
            </div>
          );
        };
      `;

      // Test require-memo
      const memoErrors = runLint(
        code,
        { 'grain/require-memo': 'error' },
        '/src/views/test.view.fn.tsx'
      );
      expect(memoErrors.some(e => e.ruleId === 'grain/require-memo')).toBe(true);

      // Test no-inline-functions
      const inlineErrors = runLint(code, { 'grain/no-inline-functions': 'error' });
      expect(inlineErrors.some(e => e.ruleId === 'grain/no-inline-functions')).toBe(true);

      // Test hooks-patterns
      const hooksErrors = runLint(code, { 'grain/hooks-patterns': 'error' });
      expect(hooksErrors.some(e => e.ruleId === 'grain/hooks-patterns')).toBe(true);

      // Test component-patterns
      const patternsErrors = runLint(
        code,
        { 'grain/component-patterns': 'error' },
        '/src/views/test.view.fn.tsx'
      );
      expect(patternsErrors.some(e => e.ruleId === 'grain/component-patterns')).toBe(true);
    });
  });
});
