"use client";

import React from "react";

/**
 * 解析文本中的快捷键，并用代码格式包裹
 * 支持识别：Ctrl/Cmd + X, Ctrl + X, Cmd + X, Cmd/Ctrl + X, Ctrl+Shift+F, F11, Esc 等格式
 */
function formatKeyboardShortcut(text: string): React.ReactNode[] {
  // 匹配快捷键的模式 - 更精确的匹配，包括各种组合键
  // 注意：匹配顺序很重要，先匹配长的组合，再匹配短的
  
  // 复杂组合键模式（Ctrl/Cmd + Shift/Alt + 键）
  const complexPattern = /(Ctrl\/Cmd|Cmd\/Ctrl|Ctrl|Cmd)\s*\+\s*(Shift|Alt)\s*\+\s*[A-Z0-9\s\+\-←→↑↓]+/gi;
  
  // 简单组合键模式（Ctrl/Cmd + 键）
  const simplePattern = /(Ctrl\/Cmd|Cmd\/Ctrl|Ctrl|Cmd)\s*\+\s*[A-Z0-9\s\+\-←→↑↓]+/gi;
  
  // Shift/Alt 组合键
  const modifierPattern = /(Shift|Alt)\s*\+\s*[A-Z0-9\s\+\-]+/gi;
  
  // 单个功能键
  const singleKeyPattern = /\b(F\d+|Esc|Enter|Tab|Backspace|Delete|Home|End|PageUp|PageDown|Space|Insert)\b/gi;
  
  // 方向键
  const arrowPattern = /(←|→|↑|↓)/g;
  
  // 合并所有模式（按优先级排序）
  const allPatterns = [complexPattern, simplePattern, modifierPattern, singleKeyPattern, arrowPattern];
  
  const parts: React.ReactNode[] = [];
  const matches: Array<{ index: number; length: number; text: string }> = [];
  
  // 收集所有匹配
  allPatterns.forEach(pattern => {
    pattern.lastIndex = 0; // 重置正则状态
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      // 检查是否与已有匹配重叠
      const currentMatch = match; // 保存当前匹配以避免 null 检查问题
      const overlaps = matches.some(m => 
        (currentMatch.index >= m.index && currentMatch.index < m.index + m.length) ||
        (m.index >= currentMatch.index && m.index < currentMatch.index + currentMatch[0].length)
      );
      
      if (!overlaps) {
        matches.push({
          index: currentMatch.index,
          length: currentMatch[0].length,
          text: currentMatch[0]
        });
      }
    }
  });
  
  // 按位置排序
  matches.sort((a, b) => a.index - b.index);
  
  // 构建结果
  let lastIndex = 0;
  matches.forEach((match, index) => {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        parts.push(beforeText);
      }
    }
    
    // 添加格式化的快捷键（用 code/inline code 样式包裹）
    parts.push(
      <code
        key={`shortcut-${index}`}
        className="px-1.5 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
      >
        {match.text}
      </code>
    );
    
    lastIndex = match.index + match.length;
  });
  
  // 添加剩余的文本
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * 客户端组件：渲染包含快捷键的格式化文本
 */
export function FormattedText({ text }: { text: string }) {
  return <>{formatKeyboardShortcut(text)}</>;
}








