/**
 * Utility functions tests
 */

import { describe, it, expect } from 'vitest';
import {
  getArchitectureLayer,
  isContainerComponent,
  isViewComponent,
  isTestFile,
  getExpectedTestFilePath,
  isExternalImport,
  isInternalImport,
  getAllowedDependencies,
  getImportLayer,
  DEPRECATED_MODULES,
  SIDE_EFFECT_GLOBALS,
  REACT_IMPORTS,
  FILE_NAMING_PATTERNS,
} from '../utils';

describe('Architecture Layer Detection', () => {
  it('should detect views layer', () => {
    expect(getArchitectureLayer('/project/src/views/sidebar.view.fn.tsx')).toBe('views');
  });

  it('should detect pipes layer', () => {
    expect(getArchitectureLayer('/project/src/pipes/transform.pipe.ts')).toBe('pipes');
  });

  it('should detect flows layer', () => {
    expect(getArchitectureLayer('/project/src/flows/create-node.flow.ts')).toBe('flows');
  });

  it('should return null for unknown paths', () => {
    expect(getArchitectureLayer('/project/other/file.ts')).toBeNull();
  });
});

describe('Component Type Detection', () => {
  it('should detect container components', () => {
    expect(isContainerComponent('sidebar.container.fn.tsx')).toBe(true);
    expect(isContainerComponent('sidebar.view.fn.tsx')).toBe(false);
  });

  it('should detect view components', () => {
    expect(isViewComponent('sidebar.view.fn.tsx')).toBe(true);
    expect(isViewComponent('sidebar.container.fn.tsx')).toBe(false);
  });

  it('should detect test files', () => {
    expect(isTestFile('component.test.ts')).toBe(true);
    expect(isTestFile('component.spec.tsx')).toBe(true);
    expect(isTestFile('component.ts')).toBe(false);
  });
});

describe('Test File Path Generation', () => {
  it('should generate correct test file paths', () => {
    expect(getExpectedTestFilePath('src/pipes/transform.pipe.ts')).toBe('src/pipes/transform.pipe.test.ts');
    expect(getExpectedTestFilePath('src/views/sidebar.view.fn.tsx')).toBe('src/views/sidebar.view.fn.test.tsx');
  });
});

describe('Import Type Detection', () => {
  it('should detect external imports', () => {
    expect(isExternalImport('react')).toBe(true);
    expect(isExternalImport('lodash')).toBe(true);
    expect(isExternalImport('@/utils/helper')).toBe(false);
    expect(isExternalImport('./local')).toBe(false);
  });

  it('should detect internal imports', () => {
    expect(isInternalImport('@/utils/helper')).toBe(true);
    expect(isInternalImport('./local')).toBe(true);
    expect(isInternalImport('../parent')).toBe(true);
    expect(isInternalImport('react')).toBe(false);
  });
});

describe('Layer Dependencies', () => {
  it('should return correct allowed dependencies for views', () => {
    const allowed = getAllowedDependencies('views');
    expect(allowed).toEqual(['hooks', 'types']);
  });

  it('should return correct allowed dependencies for pipes', () => {
    const allowed = getAllowedDependencies('pipes');
    expect(allowed).toEqual(['utils', 'types']);
  });

  it('should return empty array for unknown layer', () => {
    const allowed = getAllowedDependencies('unknown');
    expect(allowed).toEqual([]);
  });
});

describe('Import Layer Extraction', () => {
  it('should extract layer from import path', () => {
    expect(getImportLayer('@/views/sidebar')).toBe('views');
    expect(getImportLayer('@/pipes/transform')).toBe('pipes');
    expect(getImportLayer('@/flows/create-node')).toBe('flows');
    expect(getImportLayer('react')).toBeNull();
    expect(getImportLayer('./local')).toBeNull();
  });
});

describe('Constants', () => {
  it('should have deprecated modules mapping', () => {
    expect(DEPRECATED_MODULES.lodash).toBe('es-toolkit');
    expect(DEPRECATED_MODULES.moment).toBe('dayjs');
  });

  it('should have side effect globals list', () => {
    expect(SIDE_EFFECT_GLOBALS).toContain('window');
    expect(SIDE_EFFECT_GLOBALS).toContain('localStorage');
    expect(SIDE_EFFECT_GLOBALS).toContain('fetch');
  });

  it('should have React imports list', () => {
    expect(REACT_IMPORTS).toContain('react');
    expect(REACT_IMPORTS).toContain('react-dom');
  });

  it('should have file naming patterns', () => {
    expect(FILE_NAMING_PATTERNS.pipes.test('transform.pipe.ts')).toBe(true);
    expect(FILE_NAMING_PATTERNS.flows.test('create-node.flow.ts')).toBe(true);
    expect(FILE_NAMING_PATTERNS['views/view'].test('sidebar.view.fn.tsx')).toBe(true);
  });
});