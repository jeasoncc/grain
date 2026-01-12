/**
 * Architecture 工具函数单元测试
 * Tests for architecture utility functions
 */

import { describe, it, expect } from 'vitest';
import {
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
} from '../utils/architecture.js';

describe('getArchitectureLayer', () => {
  it('should detect views layer', () => {
    expect(getArchitectureLayer('/project/src/views/sidebar.view.fn.tsx')).toBe('views');
    expect(getArchitectureLayer('/project/src/views/file-tree/tree.view.fn.tsx')).toBe('views');
  });

  it('should detect hooks layer', () => {
    expect(getArchitectureLayer('/project/src/hooks/use-workspace.ts')).toBe('hooks');
  });

  it('should detect flows layer', () => {
    expect(getArchitectureLayer('/project/src/flows/node/create-node.flow.ts')).toBe('flows');
  });

  it('should detect pipes layer', () => {
    expect(getArchitectureLayer('/project/src/pipes/transform.pipe.ts')).toBe('pipes');
  });

  it('should detect io layer', () => {
    expect(getArchitectureLayer('/project/src/io/api/node.api.ts')).toBe('io');
    expect(getArchitectureLayer('/project/src/io/storage/settings.storage.ts')).toBe('io');
  });

  it('should detect state layer', () => {
    expect(getArchitectureLayer('/project/src/state/selection.state.ts')).toBe('state');
  });

  it('should detect utils layer', () => {
    expect(getArchitectureLayer('/project/src/utils/date.util.ts')).toBe('utils');
  });

  it('should detect types layer', () => {
    expect(getArchitectureLayer('/project/src/types/node.interface.ts')).toBe('types');
  });

  it('should detect queries layer', () => {
    expect(getArchitectureLayer('/project/src/queries/node.queries.ts')).toBe('queries');
  });

  it('should detect routes layer', () => {
    expect(getArchitectureLayer('/project/src/routes/index.tsx')).toBe('routes');
  });

  it('should return null for unknown paths', () => {
    expect(getArchitectureLayer('/project/other/file.ts')).toBeNull();
    expect(getArchitectureLayer('/project/src/components/button.tsx')).toBeNull();
  });
});

describe('isContainerComponent', () => {
  it('should detect container components', () => {
    expect(isContainerComponent('sidebar.container.fn.tsx')).toBe(true);
    expect(isContainerComponent('/src/views/sidebar.container.fn.tsx')).toBe(true);
  });

  it('should not detect non-container components', () => {
    expect(isContainerComponent('sidebar.view.fn.tsx')).toBe(false);
    expect(isContainerComponent('sidebar.tsx')).toBe(false);
  });
});

describe('isViewComponent', () => {
  it('should detect view components', () => {
    expect(isViewComponent('sidebar.view.fn.tsx')).toBe(true);
    expect(isViewComponent('/src/views/sidebar.view.fn.tsx')).toBe(true);
  });

  it('should not detect non-view components', () => {
    expect(isViewComponent('sidebar.container.fn.tsx')).toBe(false);
    expect(isViewComponent('sidebar.tsx')).toBe(false);
  });
});

describe('isTestFile', () => {
  it('should detect test files', () => {
    expect(isTestFile('component.test.ts')).toBe(true);
    expect(isTestFile('component.spec.tsx')).toBe(true);
    expect(isTestFile('utils.test.ts')).toBe(true);
  });

  it('should not detect non-test files', () => {
    expect(isTestFile('component.ts')).toBe(false);
    expect(isTestFile('test-utils.ts')).toBe(false);
  });
});

describe('getImportLayer', () => {
  it('should extract layer from alias imports', () => {
    expect(getImportLayer('@/views/sidebar')).toBe('views');
    expect(getImportLayer('@/pipes/transform')).toBe('pipes');
    expect(getImportLayer('@/flows/create-node')).toBe('flows');
    expect(getImportLayer('@/io/api/node')).toBe('io');
    expect(getImportLayer('@/state/selection')).toBe('state');
  });

  it('should return null for non-alias imports', () => {
    expect(getImportLayer('react')).toBeNull();
    expect(getImportLayer('./local')).toBeNull();
    expect(getImportLayer('../parent')).toBeNull();
  });

  it('should return null for unknown layers', () => {
    expect(getImportLayer('@/unknown/module')).toBeNull();
  });
});

describe('getAllowedDependencies', () => {
  it('should return correct dependencies for views (strict mode)', () => {
    const allowed = getAllowedDependencies('views', true);
    expect(allowed).toEqual(['hooks', 'types']);
  });

  it('should return correct dependencies for pipes (strict mode)', () => {
    const allowed = getAllowedDependencies('pipes', true);
    expect(allowed).toEqual(['utils', 'types']);
  });

  it('should return correct dependencies for flows (strict mode)', () => {
    const allowed = getAllowedDependencies('flows', true);
    expect(allowed).toEqual(['pipes', 'io', 'state', 'types']);
  });

  it('should return correct dependencies for state (strict mode)', () => {
    const allowed = getAllowedDependencies('state', true);
    expect(allowed).toEqual(['types']); // 严格模式不允许 pipes
  });

  it('should return correct dependencies for state (legacy mode)', () => {
    const allowed = getAllowedDependencies('state', false);
    expect(allowed).toEqual(['types', 'pipes']); // 宽松模式允许 pipes
  });

  it('should return empty array for types layer', () => {
    const allowed = getAllowedDependencies('types', true);
    expect(allowed).toEqual([]);
  });
});

describe('getContainerExtraDependencies', () => {
  it('should return extra dependencies for container components', () => {
    const extra = getContainerExtraDependencies();
    expect(extra).toContain('flows');
    expect(extra).toContain('state');
  });
});

describe('isLayerViolation', () => {
  it('should detect views -> flows violation', () => {
    expect(isLayerViolation('views', 'flows', false, true)).toBe(true);
  });

  it('should detect views -> io violation', () => {
    expect(isLayerViolation('views', 'io', false, true)).toBe(true);
  });

  it('should detect pipes -> io violation', () => {
    expect(isLayerViolation('pipes', 'io', false, true)).toBe(true);
  });

  it('should detect pipes -> state violation', () => {
    expect(isLayerViolation('pipes', 'state', false, true)).toBe(true);
  });

  it('should allow views -> hooks', () => {
    expect(isLayerViolation('views', 'hooks', false, true)).toBe(false);
  });

  it('should allow views -> types', () => {
    expect(isLayerViolation('views', 'types', false, true)).toBe(false);
  });

  it('should allow container -> flows', () => {
    expect(isLayerViolation('views', 'flows', true, true)).toBe(false);
  });

  it('should allow container -> state', () => {
    expect(isLayerViolation('views', 'state', true, true)).toBe(false);
  });
});

describe('getLayerViolationDetails', () => {
  it('should return violation details', () => {
    const details = getLayerViolationDetails('views', 'flows', true);
    expect(details.allowed).toEqual(['hooks', 'types']);
    expect(details.message).toContain('views/ 层不能依赖 flows/ 层');
    expect(details.suggestion).toContain('hooks, types');
  });
});

describe('isDeprecatedDirectoryImport', () => {
  it('should detect deprecated directory imports', () => {
    expect(isDeprecatedDirectoryImport('@/fn/utils')).toBe(true);
    expect(isDeprecatedDirectoryImport('@/components/button')).toBe(true);
    expect(isDeprecatedDirectoryImport('@/actions/create')).toBe(true);
    expect(isDeprecatedDirectoryImport('@/stores/app')).toBe(true);
    expect(isDeprecatedDirectoryImport('@/lib/helpers')).toBe(true);
  });

  it('should not detect valid directory imports', () => {
    expect(isDeprecatedDirectoryImport('@/views/sidebar')).toBe(false);
    expect(isDeprecatedDirectoryImport('@/pipes/transform')).toBe(false);
    expect(isDeprecatedDirectoryImport('react')).toBe(false);
  });
});

describe('getDeprecatedDirectoryMigration', () => {
  it('should return migration suggestions', () => {
    expect(getDeprecatedDirectoryMigration('fn')).toContain('pipes');
    expect(getDeprecatedDirectoryMigration('components')).toContain('views');
    expect(getDeprecatedDirectoryMigration('actions')).toContain('flows');
    expect(getDeprecatedDirectoryMigration('stores')).toContain('state');
    expect(getDeprecatedDirectoryMigration('lib')).toContain('utils');
  });
});

describe('Import Type Detection', () => {
  it('should detect external imports', () => {
    expect(isExternalImport('react')).toBe(true);
    expect(isExternalImport('lodash')).toBe(true);
    expect(isExternalImport('@tanstack/react-query')).toBe(true);
    expect(isExternalImport('@/utils/helper')).toBe(false);
    expect(isExternalImport('./local')).toBe(false);
  });

  it('should detect internal imports', () => {
    expect(isInternalImport('@/utils/helper')).toBe(true);
    expect(isInternalImport('./local')).toBe(true);
    expect(isInternalImport('../parent')).toBe(true);
    expect(isInternalImport('react')).toBe(false);
  });

  it('should detect relative imports', () => {
    expect(isRelativeImport('./local')).toBe(true);
    expect(isRelativeImport('../parent')).toBe(true);
    expect(isRelativeImport('@/utils')).toBe(false);
    expect(isRelativeImport('react')).toBe(false);
  });

  it('should detect alias imports', () => {
    expect(isAliasImport('@/utils/helper')).toBe(true);
    expect(isAliasImport('./local')).toBe(false);
    expect(isAliasImport('react')).toBe(false);
  });
});

describe('getRelativeImportDepth', () => {
  it('should calculate relative import depth', () => {
    expect(getRelativeImportDepth('./local')).toBe(0);
    expect(getRelativeImportDepth('../parent')).toBe(1);
    expect(getRelativeImportDepth('../../grandparent')).toBe(2);
    expect(getRelativeImportDepth('../../../great')).toBe(3);
  });
});

describe('isRelativeImportTooDeep', () => {
  it('should detect too deep relative imports', () => {
    expect(isRelativeImportTooDeep('../../../deep', 2)).toBe(true);
    expect(isRelativeImportTooDeep('../../ok', 2)).toBe(false);
    expect(isRelativeImportTooDeep('../parent', 2)).toBe(false);
  });
});

describe('getExpectedTestFilePath', () => {
  it('should generate correct test file paths', () => {
    expect(getExpectedTestFilePath('src/pipes/transform.pipe.ts')).toBe('src/pipes/transform.pipe.test.ts');
    expect(getExpectedTestFilePath('src/views/sidebar.view.fn.tsx')).toBe('src/views/sidebar.view.fn.test.tsx');
  });
});

describe('isFileInCorrectDirectory', () => {
  it('should check if file is in correct directory', () => {
    expect(isFileInCorrectDirectory('/src/pipes/transform.pipe.ts', 'pipes')).toBe(true);
    expect(isFileInCorrectDirectory('/src/views/sidebar.view.fn.tsx', 'views')).toBe(true);
    expect(isFileInCorrectDirectory('/src/pipes/transform.pipe.ts', 'flows')).toBe(false);
  });
});

describe('getSuggestedDirectory', () => {
  it('should return suggested directories', () => {
    expect(getSuggestedDirectory('transform.ts', 'pipe')).toBe('src/pipes/');
    expect(getSuggestedDirectory('create.ts', 'flow')).toBe('src/flows/');
    expect(getSuggestedDirectory('node.ts', 'api')).toBe('src/io/api/');
    expect(getSuggestedDirectory('selection.ts', 'state')).toBe('src/state/');
    expect(getSuggestedDirectory('use-data.ts', 'hook')).toBe('src/hooks/');
    expect(getSuggestedDirectory('sidebar.tsx', 'view')).toBe('src/views/');
    expect(getSuggestedDirectory('date.ts', 'util')).toBe('src/utils/');
  });
});

describe('isIndexFilePattern', () => {
  it('should detect index files', () => {
    expect(isIndexFilePattern('/src/pipes/index.ts')).toBe(true);
    expect(isIndexFilePattern('/src/views/index.tsx')).toBe(true);
    expect(isIndexFilePattern('/src/pipes/transform.pipe.ts')).toBe(false);
  });
});

describe('getLayerChineseName', () => {
  it('should return Chinese names for layers', () => {
    expect(getLayerChineseName('views')).toBe('视图层');
    expect(getLayerChineseName('hooks')).toBe('绑定层');
    expect(getLayerChineseName('flows')).toBe('流程层');
    expect(getLayerChineseName('pipes')).toBe('管道层');
    expect(getLayerChineseName('io')).toBe('IO 层');
    expect(getLayerChineseName('state')).toBe('状态层');
    expect(getLayerChineseName('utils')).toBe('工具层');
    expect(getLayerChineseName('types')).toBe('类型层');
  });
});

describe('getLayerDescription', () => {
  it('should return descriptions for layers', () => {
    expect(getLayerDescription('views')).toContain('UI');
    expect(getLayerDescription('pipes')).toContain('纯');
    expect(getLayerDescription('flows')).toContain('业务');
    expect(getLayerDescription('io')).toContain('外部');
  });
});
