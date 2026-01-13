#!/usr/bin/env node

/**
 * Fix ESM imports by adding .js extensions
 * This is needed because TypeScript doesn't automatically add extensions when compiling to ESM
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');

async function* walkDir(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const path = join(dir, file.name);
    if (file.isDirectory()) {
      yield* walkDir(path);
    } else if (file.name.endsWith('.js')) {
      yield path;
    }
  }
}

async function fixImports(filePath) {
  let content = await readFile(filePath, 'utf-8');
  let modified = false;

  // Fix relative imports without .js extension
  content = content.replace(
    /from\s+['"](\.[^'"]+)(?<!\.js)['"]/g,
    (match, path) => {
      modified = true;
      return `from '${path}.js'`;
    }
  );

  // Fix export statements
  content = content.replace(
    /export\s+\{[^}]+\}\s+from\s+['"](\.[^'"]+)(?<!\.js)['"]/g,
    (match, path) => {
      modified = true;
      return match.replace(path, `${path}.js`);
    }
  );

  // Fix export * statements
  content = content.replace(
    /export\s+\*\s+from\s+['"](\.[^'"]+)(?<!\.js)['"]/g,
    (match, path) => {
      modified = true;
      return `export * from '${path}.js'`;
    }
  );

  if (modified) {
    await writeFile(filePath, content, 'utf-8');
    console.log(`Fixed: ${filePath}`);
  }
}

async function main() {
  console.log('Fixing ESM imports...');
  let count = 0;
  
  for await (const file of walkDir(distDir)) {
    await fixImports(file);
    count++;
  }
  
  console.log(`Processed ${count} files`);
}

main().catch(console.error);
