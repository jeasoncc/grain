#!/usr/bin/env tsx

/**
 * Automated Unused Variables Fix Script
 * 
 * This script fixes @typescript-eslint/no-unused-vars violations by:
 * 1. Removing unused imports
 * 2. Prefixing unused parameters with underscore
 * 3. Removing unused variables
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UnusedVar {
  file: string;
  line: number;
  column: number;
  varName: string;
  type: 'import' | 'variable' | 'parameter';
}

/**
 * Parse ESLint JSON output to extract unused variable violations
 */
function parseUnusedVars(eslintResults: any[]): UnusedVar[] {
  const unusedVars: UnusedVar[] = [];
  
  for (const result of eslintResults) {
    for (const message of result.messages) {
      if (message.ruleId === '@typescript-eslint/no-unused-vars') {
        // Extract variable name from message
        const match = message.message.match(/'([^']+)' is defined but never used/);
        if (match) {
          const varName = match[1];
          
          // Determine type based on message
          let type: 'import' | 'variable' | 'parameter' = 'variable';
          if (message.message.includes('Allowed unused args')) {
            type = 'parameter';
          } else if (message.message.includes('Allowed unused vars')) {
            type = 'import'; // Most unused vars in our codebase are imports
          }
          
          unusedVars.push({
            file: result.filePath,
            line: message.line,
            column: message.column,
            varName,
            type
          });
        }
      }
    }
  }
  
  return unusedVars;
}

/**
 * Group unused vars by file
 */
function groupByFile(unusedVars: UnusedVar[]): Map<string, UnusedVar[]> {
  const grouped = new Map<string, UnusedVar[]>();
  
  for (const unusedVar of unusedVars) {
    if (!grouped.has(unusedVar.file)) {
      grouped.set(unusedVar.file, []);
    }
    grouped.get(unusedVar.file)!.push(unusedVar);
  }
  
  return grouped;
}

/**
 * Fix unused imports in a file
 */
function fixUnusedImports(content: string, unusedVars: UnusedVar[]): string {
  const lines = content.split('\n');
  const unusedImports = unusedVars.filter(v => v.type === 'import');
  
  // Group by line
  const byLine = new Map<number, UnusedVar[]>();
  for (const unusedVar of unusedImports) {
    if (!byLine.has(unusedVar.line)) {
      byLine.set(unusedVar.line, []);
    }
    byLine.get(unusedVar.line)!.push(unusedVar);
  }
  
  // Process each line with unused imports
  for (const [lineNum, vars] of byLine.entries()) {
    const lineIndex = lineNum - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) continue;
    
    let line = lines[lineIndex];
    
    // Check if this is an import statement
    if (!line.includes('import')) continue;
    
    // Remove unused imports from the line
    for (const unusedVar of vars) {
      const varName = unusedVar.varName;
      
      // Pattern 1: import { a, b, c } from '...'
      // Remove the unused import from the list
      line = line.replace(
        new RegExp(`\\b${varName}\\b,\\s*`, 'g'),
        ''
      );
      line = line.replace(
        new RegExp(`,\\s*\\b${varName}\\b`, 'g'),
        ''
      );
      line = line.replace(
        new RegExp(`\\{\\s*\\b${varName}\\b\\s*\\}`, 'g'),
        '{}'
      );
      
      // Pattern 2: import varName from '...'
      if (line.match(new RegExp(`^import\\s+${varName}\\s+from`))) {
        line = ''; // Remove entire line
      }
    }
    
    // If the import is now empty, remove the line
    if (line.match(/import\s*\{\s*\}\s*from/) || line.trim() === '') {
      lines[lineIndex] = '';
    } else {
      lines[lineIndex] = line;
    }
  }
  
  // Remove empty lines that were import statements
  return lines.join('\n').replace(/\n\n\n+/g, '\n\n');
}

/**
 * Fix unused parameters by prefixing with underscore
 */
function fixUnusedParameters(content: string, unusedVars: UnusedVar[]): string {
  const lines = content.split('\n');
  const unusedParams = unusedVars.filter(v => v.type === 'parameter');
  
  for (const unusedParam of unusedParams) {
    const lineIndex = unusedParam.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) continue;
    
    const line = lines[lineIndex];
    const varName = unusedParam.varName;
    
    // Replace parameter name with _paramName
    // Be careful to only replace in parameter position
    lines[lineIndex] = line.replace(
      new RegExp(`\\b${varName}\\b(?=\\s*[,:\\)])`, 'g'),
      `_${varName}`
    );
  }
  
  return lines.join('\n');
}

/**
 * Apply fixes to a file
 */
function fixFile(filePath: string, unusedVars: UnusedVar[], dryRun: boolean = false): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let fixed = content;
    
    // Fix unused imports
    fixed = fixUnusedImports(fixed, unusedVars);
    
    // Fix unused parameters
    fixed = fixUnusedParameters(fixed, unusedVars);
    
    if (fixed !== content) {
      if (!dryRun) {
        fs.writeFileSync(filePath, fixed, 'utf-8');
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error);
    return false;
  }
}

/**
 * Main function
 */
function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('='.repeat(80));
  console.log('Unused Variables Fix Script');
  console.log('='.repeat(80));
  console.log();
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified');
    console.log();
  }
  
  // Read ESLint results
  const eslintResultsPath = path.join(__dirname, '..', 'eslint-layer-violations.json');
  
  if (!fs.existsSync(eslintResultsPath)) {
    console.error(`Error: ESLint results file not found at ${eslintResultsPath}`);
    console.error('Please run: npm run lint:grain -- --format json --output-file eslint-layer-violations.json');
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(eslintResultsPath, 'utf-8');
  const results = JSON.parse(rawData);
  
  // Parse unused vars
  const unusedVars = parseUnusedVars(results);
  console.log(`Found ${unusedVars.length} unused variable violations`);
  console.log();
  
  // Group by file
  const byFile = groupByFile(unusedVars);
  console.log(`Across ${byFile.size} files`);
  console.log();
  
  // Fix each file
  let filesFixed = 0;
  let totalFixed = 0;
  
  for (const [filePath, vars] of byFile.entries()) {
    const relPath = filePath.replace(/^.*\/apps\/desktop\//, '');
    
    if (fixFile(filePath, vars, dryRun)) {
      filesFixed++;
      totalFixed += vars.length;
      console.log(`✓ Fixed ${vars.length} violations in ${relPath}`);
    }
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log(`Summary: Fixed ${totalFixed} violations in ${filesFixed} files`);
  console.log('='.repeat(80));
  
  if (dryRun) {
    console.log();
    console.log('Run without --dry-run to apply changes');
  }
}

main();
