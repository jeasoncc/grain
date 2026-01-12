#!/usr/bin/env tsx

/**
 * Fix no-undef Violations Script
 * 
 * This script addresses no-undef ESLint violations by:
 * 1. Identifying undefined browser globals (window, document, localStorage, etc.)
 * 2. Adding proper type declarations or ESLint configuration
 * 3. Adding missing imports for custom types and logger functions
 * 
 * Usage:
 *   npx tsx scripts/fix-no-undef.ts [--dry-run]
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { resolve } from 'path';

interface FixStats {
  filesProcessed: number;
  filesModified: number;
  undefinedGlobals: Map<string, number>;
  missingImports: Map<string, number>;
  errors: string[];
}

const stats: FixStats = {
  filesProcessed: 0,
  filesModified: 0,
  undefinedGlobals: new Map(),
  missingImports: new Map(),
  errors: [],
};

// Browser globals that are commonly undefined
const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'clearInterval',
  'setInterval',
  'setTimeout',
  'clearTimeout',
  'caches',
  'navigator',
  'location',
  'history',
  'fetch',
  'console',
  'alert',
  'confirm',
  'prompt',
]);

// Logger functions that need to be imported
const LOGGER_FUNCTIONS = new Set([
  'debug',
  'info',
  'success',
  'warn',
  'error',
  'trace',
]);

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Analyze a file for no-undef violations
 */
function analyzeFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    stats.filesProcessed++;

    // Find all potential undefined references
    // This is a simple regex-based approach - not as accurate as AST parsing
    // but sufficient for identifying browser globals
    
    for (const global of BROWSER_GLOBALS) {
      const regex = new RegExp(`\\b${global}\\b`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        const count = stats.undefinedGlobals.get(global) || 0;
        stats.undefinedGlobals.set(global, count + matches.length);
      }
    }

    // Check for logger functions used without import
    for (const func of LOGGER_FUNCTIONS) {
      const regex = new RegExp(`\\b${func}\\(`, 'g');
      const matches = content.match(regex);
      
      if (matches && !content.includes(`import {`) || !content.includes(`${func}`)) {
        const count = stats.missingImports.get(func) || 0;
        stats.missingImports.set(func, count + matches.length);
      }
    }
  } catch (error) {
    stats.errors.push(`Error processing ${filePath}: ${error}`);
  }
}

/**
 * Fix missing logger imports in a file
 */
function fixLoggerImports(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Check if file uses logger functions
    const usedLoggerFunctions: string[] = [];
    for (const func of LOGGER_FUNCTIONS) {
      const regex = new RegExp(`\\b${func}\\(`, 'g');
      if (regex.test(content)) {
        usedLoggerFunctions.push(func);
      }
    }
    
    if (usedLoggerFunctions.length === 0) {
      return false;
    }
    
    // Check if logger import already exists
    const hasLoggerImport = /import\s+{[^}]*}\s+from\s+['"]@\/io\/log\/logger\.api['"]/.test(content);
    
    if (hasLoggerImport) {
      // Check if all used functions are imported
      const importMatch = content.match(/import\s+{([^}]*)}\s+from\s+['"]@\/io\/log\/logger\.api['"]/);
      if (importMatch) {
        const importedFunctions = importMatch[1].split(',').map(f => f.trim());
        const missingFunctions = usedLoggerFunctions.filter(f => !importedFunctions.includes(f));
        
        if (missingFunctions.length > 0) {
          // Add missing functions to existing import
          const newImport = `import { ${[...importedFunctions, ...missingFunctions].join(', ')} } from "@/io/log/logger.api"`;
          content = content.replace(/import\s+{[^}]*}\s+from\s+['"]@\/io\/log\/logger\.api['"]/, newImport);
        } else {
          return false; // All functions already imported
        }
      }
    } else {
      // Add new logger import
      const loggerImport = `import { ${usedLoggerFunctions.join(', ')} } from "@/io/log/logger.api";\n`;
      
      // Find the last import statement
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, loggerImport);
        content = lines.join('\n');
      } else {
        // No imports found, add at the beginning after comments
        const firstNonCommentLine = lines.findIndex(line => 
          !line.trim().startsWith('//') && 
          !line.trim().startsWith('/*') && 
          !line.trim().startsWith('*') &&
          line.trim() !== ''
        );
        
        if (firstNonCommentLine !== -1) {
          lines.splice(firstNonCommentLine, 0, loggerImport);
          content = lines.join('\n');
        }
      }
    }
    
    if (content !== originalContent) {
      if (!DRY_RUN) {
        writeFileSync(filePath, content, 'utf-8');
        stats.filesModified++;
        return true;
      } else {
        console.log(`[DRY RUN] Would fix logger imports in ${filePath}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    stats.errors.push(`Error fixing logger imports in ${filePath}: ${error}`);
    return false;
  }
}

/**
 * Update ESLint configuration to include browser globals
 */
function updateESLintConfig(): boolean {
  const configPath = resolve(process.cwd(), 'eslint.config.grain.js');
  
  try {
    let content = readFileSync(configPath, 'utf-8');
    
    // Check if languageOptions.globals is already configured
    if (content.includes('globals.browser')) {
      console.log('✓ ESLint config already has globals configuration');
      return false;
    }

    // Add globals import if not present
    if (!content.includes("import globals from 'globals'")) {
      // Find the last import statement
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, "import globals from 'globals';");
        content = lines.join('\n');
      }
    }

    // Add languageOptions with browser globals to the main config object
    // Find the languageOptions section in the main config
    const languageOptionsPattern = /languageOptions:\s*\{[^}]*parserOptions:/;
    const match = content.match(languageOptionsPattern);
    
    if (match) {
      // Insert globals before parserOptions
      const insertPos = content.indexOf('parserOptions:', content.indexOf(match[0]));
      const globalsConfig = `globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      `;
      
      content = content.slice(0, insertPos) + globalsConfig + content.slice(insertPos);
      
      if (!DRY_RUN) {
        writeFileSync(configPath, content, 'utf-8');
        console.log('✓ Updated ESLint config with browser globals');
        stats.filesModified++;
        return true;
      } else {
        console.log('[DRY RUN] Would update ESLint config with browser globals');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    stats.errors.push(`Error updating ESLint config: ${error}`);
    return false;
  }
}

/**
 * Create or update TypeScript declarations for browser globals
 */
function updateTypeDeclarations(): boolean {
  const declPath = resolve(process.cwd(), 'src/types/globals.d.ts');
  
  const declarations = `/**
 * Global type declarations for browser APIs
 * This file ensures TypeScript recognizes browser globals
 */

// Browser globals are provided by the DOM lib in tsconfig.json
// This file exists as a placeholder for any custom global declarations

declare global {
  // Add custom global declarations here if needed
}

export {};
`;

  try {
    if (!DRY_RUN) {
      writeFileSync(declPath, declarations, 'utf-8');
      console.log('✓ Created/updated TypeScript global declarations');
      stats.filesModified++;
      return true;
    } else {
      console.log('[DRY RUN] Would create/update TypeScript global declarations');
      return true;
    }
  } catch (error) {
    stats.errors.push(`Error creating type declarations: ${error}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Analyzing no-undef violations...\n');
  
  if (DRY_RUN) {
    console.log('🏃 Running in DRY RUN mode - no files will be modified\n');
  }

  // Find all TypeScript files
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.test.tsx', '**/types/**'],
  });

  console.log(`Found ${files.length} files to analyze\n`);

  // Analyze all files
  for (const file of files) {
    analyzeFile(file);
  }

  // Print analysis results
  console.log('📊 Analysis Results:\n');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`\nUndefined globals found:`);
  
  const sortedGlobals = Array.from(stats.undefinedGlobals.entries())
    .sort((a, b) => b[1] - a[1]);
  
  for (const [global, count] of sortedGlobals) {
    console.log(`  ${global}: ${count} occurrences`);
  }

  if (stats.missingImports.size > 0) {
    console.log(`\nMissing logger imports:`);
    const sortedImports = Array.from(stats.missingImports.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [func, count] of sortedImports) {
      console.log(`  ${func}: ${count} occurrences`);
    }
  }

  // Apply fixes
  console.log('\n🔧 Applying fixes...\n');
  
  // Fix 1: Update ESLint configuration
  updateESLintConfig();
  
  // Fix 2: Ensure TypeScript declarations exist
  updateTypeDeclarations();
  
  // Fix 3: Fix missing logger imports
  console.log('\n🔧 Fixing missing logger imports...\n');
  for (const file of files) {
    fixLoggerImports(file);
  }

  // Print summary
  console.log('\n✅ Fix Summary:\n');
  console.log(`Files modified: ${stats.filesModified}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\n📝 Next Steps:');
  console.log('  1. Run: npm run lint:grain to verify fixes');
  console.log('  2. Check tsconfig.json has "lib": ["ES2021", "DOM"] configured');
  console.log('  3. Manually review any remaining no-undef violations');
  
  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

main().catch(console.error);
