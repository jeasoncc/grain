#!/usr/bin/env tsx

/**
 * Architecture Layer Dependencies Analysis Script
 * 
 * This script analyzes ESLint violations for the grain/layer-dependencies rule
 * and categorizes them by fix type (wrapper vs move).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ESLintMessage {
  ruleId: string;
  severity: number;
  message: string;
  line: number;
  column: number;
  nodeType: string;
  messageId?: string;
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
}

interface LayerViolation {
  file: string;
  line: number;
  currentLayer: string;
  importLayer: string;
  allowedLayers: string[];
  fixType: 'wrapper' | 'move' | 'refactor';
  suggestion: string;
}

/**
 * Extract layer from file path
 */
function extractLayer(filePath: string): string | null {
  const match = filePath.match(/\/src\/(views|hooks|flows|pipes|io|state|utils|types)\//);
  return match ? match[1] : null;
}

/**
 * Parse ESLint message to extract violation details
 */
function parseViolationMessage(message: string): {
  currentLayer: string;
  importLayer: string;
  allowedLayers: string[];
} | null {
  // Match pattern: "❌ 架构层级违规！{currentLayer} 层不能依赖 {importLayer} 层。"
  const layerMatch = message.match(/❌ 架构层级违规！(.+?) 层不能依赖 (.+?) 层/);
  
  if (!layerMatch) {
    // Try container exception pattern
    const containerMatch = message.match(/❌ 视图组件架构违规！普通视图组件不能直接依赖 (.+?) 层/);
    if (containerMatch) {
      return {
        currentLayer: 'views',
        importLayer: containerMatch[1],
        allowedLayers: ['hooks', 'types']
      };
    }
    return null;
  }
  
  const currentLayer = layerMatch[1];
  const importLayer = layerMatch[2];
  
  // Extract allowed layers from message
  const allowedMatch = message.match(/只能依赖：(.+)/);
  const allowedLayers = allowedMatch 
    ? allowedMatch[1].split(',').map(l => l.trim())
    : [];
  
  return { currentLayer, importLayer, allowedLayers };
}

/**
 * Determine fix type based on violation
 */
function determineFixType(currentLayer: string, importLayer: string): {
  fixType: 'wrapper' | 'move' | 'refactor';
  suggestion: string;
} {
  // flows → utils: Create pipe wrapper
  if (currentLayer === 'flows' && importLayer === 'utils') {
    return {
      fixType: 'wrapper',
      suggestion: 'Create a wrapper function in pipes/ that calls the utils/ function'
    };
  }
  
  // pipes → io: Move to flows
  if (currentLayer === 'pipes' && importLayer === 'io') {
    return {
      fixType: 'move',
      suggestion: 'Move this logic to flows/ layer (pipes should be pure)'
    };
  }
  
  // pipes → state: Move to flows
  if (currentLayer === 'pipes' && importLayer === 'state') {
    return {
      fixType: 'move',
      suggestion: 'Move this logic to flows/ layer (pipes should not access state)'
    };
  }
  
  // hooks → io: Should use flows
  if (currentLayer === 'hooks' && importLayer === 'io') {
    return {
      fixType: 'refactor',
      suggestion: 'Create a flow that wraps the IO operation, then use it in the hook'
    };
  }
  
  // views → flows/state (non-container): Convert to container
  if (currentLayer === 'views' && (importLayer === 'flows' || importLayer === 'state')) {
    return {
      fixType: 'refactor',
      suggestion: 'Convert to container component (.container.fn.tsx) or move logic to hooks'
    };
  }
  
  // Default: refactor
  return {
    fixType: 'refactor',
    suggestion: `Refactor to follow architecture: ${currentLayer} should not depend on ${importLayer}`
  };
}

/**
 * Analyze ESLint results and categorize violations
 */
function analyzeViolations(results: ESLintResult[]): LayerViolation[] {
  const violations: LayerViolation[] = [];
  
  for (const result of results) {
    const fileLayer = extractLayer(result.filePath);
    
    for (const message of result.messages) {
      if (message.ruleId !== 'grain/layer-dependencies') {
        continue;
      }
      
      const parsed = parseViolationMessage(message.message);
      if (!parsed) {
        continue;
      }
      
      const { fixType, suggestion } = determineFixType(
        parsed.currentLayer,
        parsed.importLayer
      );
      
      violations.push({
        file: result.filePath,
        line: message.line,
        currentLayer: parsed.currentLayer,
        importLayer: parsed.importLayer,
        allowedLayers: parsed.allowedLayers,
        fixType,
        suggestion
      });
    }
  }
  
  return violations;
}

/**
 * Generate report
 */
function generateReport(violations: LayerViolation[]): void {
  console.log('='.repeat(80));
  console.log('Architecture Layer Dependencies Analysis Report');
  console.log('='.repeat(80));
  console.log();
  
  console.log(`Total Violations: ${violations.length}`);
  console.log();
  
  // Group by fix type
  const byFixType = violations.reduce((acc, v) => {
    if (!acc[v.fixType]) {
      acc[v.fixType] = [];
    }
    acc[v.fixType].push(v);
    return acc;
  }, {} as Record<string, LayerViolation[]>);
  
  console.log('By Fix Type:');
  for (const [fixType, viols] of Object.entries(byFixType)) {
    console.log(`  ${fixType}: ${viols.length} violations`);
  }
  console.log();
  
  // Group by layer combination
  const byLayerCombo = violations.reduce((acc, v) => {
    const key = `${v.currentLayer} → ${v.importLayer}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(v);
    return acc;
  }, {} as Record<string, LayerViolation[]>);
  
  console.log('By Layer Combination:');
  for (const [combo, viols] of Object.entries(byLayerCombo).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${combo}: ${viols.length} violations`);
  }
  console.log();
  
  // Detailed violations by fix type
  for (const [fixType, viols] of Object.entries(byFixType)) {
    console.log('='.repeat(80));
    console.log(`${fixType.toUpperCase()} Fixes (${viols.length} violations)`);
    console.log('='.repeat(80));
    console.log();
    
    // Group by layer combination within fix type
    const grouped = viols.reduce((acc, v) => {
      const key = `${v.currentLayer} → ${v.importLayer}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(v);
      return acc;
    }, {} as Record<string, LayerViolation[]>);
    
    for (const [combo, comboViols] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`${combo} (${comboViols.length} violations):`);
      console.log(`  Suggestion: ${comboViols[0].suggestion}`);
      console.log(`  Files:`);
      
      // Group by file
      const byFile = comboViols.reduce((acc, v) => {
        if (!acc[v.file]) {
          acc[v.file] = [];
        }
        acc[v.file].push(v);
        return acc;
      }, {} as Record<string, LayerViolation[]>);
      
      for (const [file, fileViols] of Object.entries(byFile)) {
        const relPath = file.replace(/^.*\/apps\/desktop\//, '');
        console.log(`    - ${relPath} (${fileViols.length} violations at lines: ${fileViols.map(v => v.line).join(', ')})`);
      }
      console.log();
    }
  }
  
  // Save detailed JSON report
  const reportPath = path.join(__dirname, '..', 'layer-dependencies-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      total: violations.length,
      byFixType: Object.entries(byFixType).map(([type, viols]) => ({
        type,
        count: viols.length
      })),
      byLayerCombo: Object.entries(byLayerCombo).map(([combo, viols]) => ({
        combo,
        count: viols.length
      })).sort((a, b) => b.count - a.count)
    },
    violations
  }, null, 2));
  
  console.log('='.repeat(80));
  console.log(`Detailed report saved to: ${reportPath}`);
  console.log('='.repeat(80));
}

/**
 * Main function
 */
function main(): void {
  const eslintResultsPath = path.join(__dirname, '..', 'eslint-layer-violations.json');
  
  if (!fs.existsSync(eslintResultsPath)) {
    console.error(`Error: ESLint results file not found at ${eslintResultsPath}`);
    console.error('Please run: npm run lint:grain -- --format json --output-file eslint-layer-violations.json');
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(eslintResultsPath, 'utf-8');
  const results: ESLintResult[] = JSON.parse(rawData);
  
  const violations = analyzeViolations(results);
  generateReport(violations);
}

main();
