# Implementation Plan: ESLint Rules Integration

## Overview

This implementation plan converts the ESLint rules integration design into a series of coding tasks that will systematically build a comprehensive ESLint configuration system enforcing Grain's functional programming architecture.

## Tasks

- [x] 1. Set up ESLint plugin infrastructure and dependencies
  - Create `eslint-plugin-grain` package structure in `apps/desktop/`
  - Install required dependencies: `@typescript-eslint/utils`, `eslint-plugin-check-file`, `eslint-plugin-functional`
  - Set up TypeScript configuration for plugin development
  - Create basic plugin entry point with empty rules object
  - _Requirements: 10.1, 10.2_

- [ ]* 1.1 Write property test for plugin infrastructure
  - **Property 26: Configuration validation completeness**
  - **Validates: Requirements 10.5**

- [x] 2. Implement functional programming enforcement rules
  - [x] 2.1 Create `no-try-catch` rule to detect TryStatement AST nodes
    - Detect try-catch blocks and suggest TaskEither alternatives
    - Provide detailed error messages with fp-ts examples
    - _Requirements: 1.1_

  - [ ]* 2.2 Write property test for try-catch detection
    - **Property 1: Try-catch prohibition enforcement**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Create `no-console-log` rule to detect console usage
    - Detect console.log CallExpression nodes
    - Suggest logger usage with proper format examples
    - _Requirements: 1.2_

  - [ ]* 2.4 Write property test for console.log detection
    - **Property 2: Console.log prohibition enforcement**
    - **Validates: Requirements 1.2**

  - [x] 2.5 Create `no-date-constructor` rule for Date usage
    - Detect Date() NewExpression and Date.now() CallExpression
    - Suggest dayjs alternatives with examples
    - _Requirements: 1.3_

  - [ ]* 2.6 Write property test for Date constructor detection
    - **Property 3: Date constructor prohibition enforcement**
    - **Validates: Requirements 1.3**

  - [x] 2.7 Create `no-lodash` rule for import restrictions
    - Detect lodash ImportDeclaration nodes
    - Suggest es-toolkit alternatives
    - _Requirements: 1.4_

  - [ ]* 2.8 Write property test for lodash import detection
    - **Property 4: Lodash import prohibition enforcement**
    - **Validates: Requirements 1.4**

  - [x] 2.9 Create `no-mutation` rule for immutability enforcement
    - Detect array.push() CallExpression and object mutation AssignmentExpression
    - Suggest immutable operation alternatives
    - _Requirements: 1.5_

  - [ ]* 2.10 Write property test for mutation detection
    - **Property 5: Mutation operation prohibition enforcement**
    - **Validates: Requirements 1.5**

- [x] 3. Implement architecture layer dependency rules
  - [x] 3.1 Create `layer-dependencies` rule for import validation
    - Analyze file path to determine layer (views/, hooks/, flows/, pipes/, io/, state/, utils/, types/)
    - Check ImportDeclaration sources against allowed dependencies
    - Provide specific architectural guidance in error messages
    - _Requirements: 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 3.2 Write property test for layer dependency enforcement
    - **Property 6: Architecture layer dependency enforcement**
    - **Validates: Requirements 1.6**

  - [x] 3.3 Create `no-react-in-pure-layers` rule
    - Detect React imports in pipes/, utils/, io/, state/ directories
    - Report architecture violations with layer explanations
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 3.4 Write property test for React prohibition in pure layers
    - **Property 7: Pure layer React prohibition**
    - **Validates: Requirements 2.1, 2.4, 2.5, 2.6, 2.7, 2.8**

  - [x] 3.5 Create `no-side-effects-in-pipes` rule
    - Detect global object access (window, document, localStorage) in pipes/
    - Report side effect violations
    - _Requirements: 4.5_

  - [ ]* 3.6 Write property test for side effect detection in pipes
    - **Property 15: Global object access in pure layers**
    - **Validates: Requirements 4.5**

- [x] 4. Checkpoint - Ensure core rules are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement file naming convention rules
  - [x] 5.1 Configure `eslint-plugin-check-file` for directory-specific naming
    - Set up filename-naming-convention rules for each directory
    - Configure patterns: .pipe.ts, .flow.ts, .api.ts, .storage.ts, .state.ts, use-*.ts, .view.fn.tsx, .container.fn.tsx, .util.ts
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 5.2 Write property test for file naming enforcement
    - **Property 10: File naming convention enforcement**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

- [ ] 6. Implement advanced functional programming rules
  - [ ] 6.1 Create `prefer-pipe` rule for nested function calls
    - Detect deeply nested CallExpression nodes (3+ levels)
    - Suggest pipe() usage for better readability
    - _Requirements: 4.1_

  - [ ]* 6.2 Write property test for nested function call detection
    - **Property 11: Nested function call detection**
    - **Validates: Requirements 4.1**

  - [ ] 6.3 Create `no-promise-catch` rule
    - Detect Promise.catch() MemberExpression nodes
    - Suggest TaskEither.tryCatch() alternatives
    - _Requirements: 4.2_

  - [ ]* 6.4 Write property test for Promise.catch detection
    - **Property 12: Promise.catch prohibition enforcement**
    - **Validates: Requirements 4.2**

  - [ ] 6.5 Create `no-throw` rule for error handling
    - Detect ThrowStatement AST nodes
    - Suggest TaskEither.left() alternatives
    - _Requirements: 4.3_

  - [ ]* 6.6 Write property test for throw statement detection
    - **Property 13: Throw statement prohibition enforcement**
    - **Validates: Requirements 4.3**

  - [ ] 6.7 Create `no-async-try-catch` rule
    - Detect async FunctionDeclaration/FunctionExpression with TryStatement
    - Suggest TaskEither pipeline usage
    - _Requirements: 4.4_

  - [ ]* 6.8 Write property test for async try-catch detection
    - **Property 14: Async/await with try-catch detection**
    - **Validates: Requirements 4.4**

- [ ] 7. Implement component pattern rules
  - [ ] 7.1 Create `no-store-in-views` rule for view components
    - Detect store access patterns in .view.fn.tsx files
    - Report architecture violations
    - _Requirements: 5.1_

  - [ ]* 7.2 Write property test for store access in views
    - **Property 16: Store access in view components**
    - **Validates: Requirements 5.1**

  - [ ] 7.3 Create `require-memo` rule for React components
    - Detect component declarations without memo() wrapper
    - Suggest performance optimization
    - _Requirements: 5.4_

  - [ ]* 7.4 Write property test for memo pattern enforcement
    - **Property 17: Component memo pattern enforcement**
    - **Validates: Requirements 5.4**

- [ ] 8. Implement testing requirement rules
  - [ ] 8.1 Create `require-fn-tests` rule for function files
    - Check file system for corresponding .fn.test.ts files
    - Report missing test files with guidance
    - _Requirements: 6.1_

  - [ ]* 8.2 Write property test for function test requirements
    - **Property 18: Test file requirement enforcement (partial)**
    - **Validates: Requirements 6.1**

  - [ ] 8.3 Create `require-flow-tests` rule for flow files
    - Check file system for corresponding .flow.test.ts files
    - Report missing test files with guidance
    - _Requirements: 6.2_

  - [ ]* 8.4 Write property test for flow test requirements
    - **Property 18: Test file requirement enforcement (partial)**
    - **Validates: Requirements 6.2**

  - [ ] 8.5 Create `require-pipe-tests` rule for pipe files
    - Check file system for corresponding .pipe.test.ts files
    - Report missing test files with guidance
    - _Requirements: 6.3_

  - [ ]* 8.6 Write property test for pipe test requirements
    - **Property 18: Test file requirement enforcement (partial)**
    - **Validates: Requirements 6.3**

  - [ ] 8.7 Create `suggest-component-tests` rule for components
    - Check file system for corresponding test files for view components
    - Suggest test file creation
    - _Requirements: 6.4_

  - [ ]* 8.8 Write property test for component test suggestions
    - **Property 19: Component test file suggestion**
    - **Validates: Requirements 6.4**

- [ ] 9. Implement import organization rules
  - [ ] 9.1 Create `import-grouping` rule for import organization
    - Detect external vs internal imports
    - Enforce grouping with external imports first
    - _Requirements: 7.1_

  - [ ]* 9.2 Write property test for import grouping
    - **Property 20: Import grouping enforcement**
    - **Validates: Requirements 7.1**

  - [ ] 9.3 Create `internal-import-alias` rule
    - Detect internal imports without @/ prefix
    - Enforce alias usage for internal modules
    - _Requirements: 7.2_

  - [ ]* 9.4 Write property test for internal import aliases
    - **Property 21: Internal import alias enforcement**
    - **Validates: Requirements 7.2**

  - [ ] 9.5 Create `no-deprecated-imports` rule
    - Maintain list of deprecated modules (lodash, etc.)
    - Suggest modern alternatives
    - _Requirements: 7.4_

  - [ ]* 9.6 Write property test for deprecated import detection
    - **Property 22: Deprecated module detection**
    - **Validates: Requirements 7.4**

- [ ] 10. Checkpoint - Ensure all rules are implemented
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Integrate enhanced ESLint configuration
  - [ ] 11.1 Update `.eslintrc.functional.js` with new custom rules
    - Add `eslint-plugin-grain` to plugins array
    - Configure all custom rules with appropriate error levels
    - Set up directory-specific overrides for each layer
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 11.2 Configure external plugin integration
    - Set up `eslint-plugin-check-file` with file naming patterns
    - Configure `eslint-plugin-functional` for additional FP enforcement
    - Ensure plugin compatibility and rule precedence
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 11.3 Add comprehensive error message templates
    - Create detailed error messages with examples for each rule
    - Include architectural principle explanations
    - Add fp-ts documentation links where relevant
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12. Implement performance optimization and monitoring
  - [ ] 12.1 Add rule performance monitoring
    - Implement timing measurements for rule execution
    - Add performance thresholds and warnings
    - Create performance reporting utilities
    - _Requirements: 9.1, 9.2_

  - [ ]* 12.2 Write property test for performance requirements
    - **Property 23: ESLint performance requirement**
    - **Validates: Requirements 9.1**

  - [ ]* 12.3 Write property test for batch processing optimization
    - **Property 24: Batch processing optimization**
    - **Validates: Requirements 9.2**

  - [ ] 12.4 Add rule debugging capabilities
    - Implement detailed rule execution logging
    - Create debugging utilities for rule development
    - Add rule execution information reporting
    - _Requirements: 10.4_

  - [ ]* 12.5 Write property test for debugging information
    - **Property 25: Rule debugging information availability**
    - **Validates: Requirements 10.4**

- [ ] 13. Create comprehensive integration tests
  - [ ] 13.1 Write full configuration integration tests
    - Test complete ESLint configuration with all rules enabled
    - Verify rule interactions and precedence
    - Test directory-specific rule application
    - _Requirements: 9.5, 10.5_

  - [ ]* 13.2 Write property test for configuration validation
    - **Property 26: Configuration validation completeness**
    - **Validates: Requirements 10.5**

  - [ ] 13.3 Create test fixtures for all rule scenarios
    - Create valid and invalid code samples for each rule
    - Set up automated testing against fixture files
    - Verify error message accuracy and helpfulness
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 14. Final integration and documentation
  - [ ] 14.1 Update project documentation
    - Create comprehensive ESLint configuration guide
    - Document all custom rules with examples
    - Add troubleshooting guide for common issues
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 14.2 Set up CI/CD integration
    - Configure ESLint to run in GitHub Actions
    - Set up performance monitoring in CI
    - Add rule coverage reporting
    - _Requirements: 9.1, 9.2_

  - [ ] 14.3 Create migration guide from current configuration
    - Document changes from existing `.eslintrc.functional.js`
    - Provide step-by-step migration instructions
    - Create automated migration script if needed
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 15. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript for type safety and better ESLint plugin development experience