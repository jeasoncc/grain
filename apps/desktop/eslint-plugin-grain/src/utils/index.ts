/**
 * Utility functions for ESLint rule development
 */

import { TSESTree } from '@typescript-eslint/utils';
import path from 'path';

/**
 * Determines the architecture layer based on file path
 */
export function getArchitectureLayer(filename: string): string | null {
  const normalizedPath = path.normalize(filename);
  
  if (normalizedPath.includes('/src/views/')) return 'views';
  if (normalizedPath.includes('/src/hooks/')) return 'hooks';
  if (normalizedPath.includes('/src/flows/')) return 'flows';
  if (normalizedPath.includes('/src/pipes/')) return 'pipes';
  if (normalizedPath.includes('/src/io/')) return 'io';
  if (normalizedPath.includes('/src/state/')) return 'state';
  if (normalizedPath.includes('/src/utils/')) return 'utils';
  if (normalizedPath.includes('/src/types/')) return 'types';
  if (normalizedPath.includes('/src/queries/')) return 'queries';
  if (normalizedPath.includes('/src/routes/')) return 'routes';
  
  return null;
}

/**
 * Checks if a file is a container component
 */
export function isContainerComponent(filename: string): boolean {
  return filename.includes('.container.fn.tsx');
}

/**
 * Checks if a file is a view component
 */
export function isViewComponent(filename: string): boolean {
  return filename.includes('.view.fn.tsx');
}

/**
 * Checks if a file is a test file
 */
export function isTestFile(filename: string): boolean {
  return /\.(test|spec)\.(ts|tsx)$/.test(filename);
}

/**
 * Gets the expected test file path for a given source file
 */
export function getExpectedTestFilePath(sourceFilePath: string): string {
  const ext = path.extname(sourceFilePath);
  const basePath = sourceFilePath.replace(ext, '');
  return `${basePath}.test${ext}`;
}

/**
 * Checks if an import is external (from node_modules)
 */
export function isExternalImport(importPath: string): boolean {
  return !importPath.startsWith('.') && !importPath.startsWith('@/');
}

/**
 * Checks if an import is internal (project module)
 */
export function isInternalImport(importPath: string): boolean {
  return importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('@/');
}

/**
 * Gets allowed dependencies for an architecture layer
 */
export function getAllowedDependencies(layer: string): string[] {
  const dependencies: Record<string, string[]> = {
    views: ['hooks', 'types'],
    hooks: ['flows', 'state', 'queries', 'types'],
    flows: ['pipes', 'io', 'state', 'types'],
    pipes: ['utils', 'types'],
    io: ['types'],
    state: ['types', 'pipes'], // pipes allowed for theme.state exception
    utils: ['types'],
    types: [],
    queries: ['io', 'types'], // TanStack Query special case
    routes: ['views', 'hooks', 'flows', 'state', 'types'],
  };
  
  return dependencies[layer] || [];
}

/**
 * Extracts the layer from an import path
 */
export function getImportLayer(importPath: string): string | null {
  const match = importPath.match(/@\/([^/]+)/);
  if (!match) return null;
  
  const firstSegment = match[1];
  
  // Map import paths to layers
  const layerMap: Record<string, string> = {
    views: 'views',
    hooks: 'hooks',
    flows: 'flows',
    pipes: 'pipes',
    io: 'io',
    state: 'state',
    utils: 'utils',
    types: 'types',
    queries: 'queries',
    routes: 'routes',
  };
  
  return layerMap[firstSegment] || null;
}

/**
 * Checks if a CallExpression is a specific method call
 */
export function isMethodCall(
  node: TSESTree.CallExpression,
  objectName: string,
  methodName: string
): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === objectName &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === methodName
  );
}

/**
 * Checks if a node is a specific global identifier
 */
export function isGlobalIdentifier(node: TSESTree.Node, name: string): boolean {
  return node.type === 'Identifier' && node.name === name;
}

/**
 * Gets the depth of nested function calls
 */
export function getCallExpressionDepth(node: TSESTree.CallExpression): number {
  let depth = 1;
  let current = node.callee;
  
  while (current.type === 'CallExpression') {
    depth++;
    current = current.callee;
  }
  
  return depth;
}

/**
 * Checks if a function is async
 */
export function isAsyncFunction(node: TSESTree.Node): boolean {
  return (
    (node.type === 'FunctionDeclaration' || 
     node.type === 'FunctionExpression' || 
     node.type === 'ArrowFunctionExpression') &&
    node.async === true
  );
}

/**
 * List of deprecated modules and their modern alternatives
 */
export const DEPRECATED_MODULES: Record<string, string> = {
  'lodash': 'es-toolkit',
  'moment': 'dayjs',
  'request': 'fetch API or axios',
  'mkdirp': 'fs.mkdir with recursive option',
  'rimraf': 'fs.rm with recursive option',
};

/**
 * List of global objects that indicate side effects
 */
export const SIDE_EFFECT_GLOBALS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
  'console',
  'alert',
  'confirm',
  'prompt',
];

/**
 * List of React-related imports
 */
export const REACT_IMPORTS = [
  'react',
  'react-dom',
  'react/*',
  'react-dom/*',
];

/**
 * File naming patterns for different layers
 */
export const FILE_NAMING_PATTERNS: Record<string, RegExp> = {
  pipes: /\.pipe\.ts$/,
  flows: /\.flow\.ts$/,
  'io/api': /\.api\.ts$/,
  'io/storage': /\.storage\.ts$/,
  state: /\.state\.ts$/,
  hooks: /^use-.+\.ts$/,
  'views/view': /\.view\.fn\.tsx$/,
  'views/container': /\.container\.fn\.tsx$/,
  utils: /\.util\.ts$/,
};