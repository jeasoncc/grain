# Implementation Plan

## 1. Add New Light Themes and Selection Colors

- [ ] 1.1 Add editorSelection color to all existing themes in themes.ts
  - Update ThemeColors interface to make editorSelection required
  - Add appropriate selection colors to themes missing them (solarized-light, light-plus, atom-one-light, winter-light, ayu-light, gruvbox-light, and most dark themes)
  - Ensure selection colors contrast with background colors
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 1.2 Write property test for selection color existence
  - **Property 3: All themes have selection color**
  - **Validates: Requirements 5.4**

- [ ]* 1.3 Write property test for selection color contrast
  - **Property 4: Selection color contrasts with background**
  - **Validates: Requirements 5.2, 5.3**

- [ ] 1.4 Add new light themes to themes.ts
  - Add Paper Light theme (warm paper-like background)
  - Add Sepia theme (classic sepia tone)
  - Add Nord Light theme (cool Nordic-inspired)
  - Ensure all new themes have editorSelection colors
  - This brings total light themes to 12 (currently 9)
  - _Requirements: 1.1, 1.3_

- [ ]* 1.5 Write property test for light theme count
  - **Property 1: Light theme count minimum**
  - **Validates: Requirements 1.1**

- [x] 1.6 Apply selection color CSS variable globally
  - ::selection CSS rule already exists in styles.css using var(--editor-selection)
  - _Requirements: 5.1, 5.5_

## 2. Fix Theme Selector Scroll Issue

- [ ] 2.1 Update theme-selector.tsx to enable scrolling
  - Add max-height constraint to PopoverContent
  - Add overflow-y-auto to theme sections container
  - Ensure all themes are accessible via scroll
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 2.2 Write unit test for theme selector scroll behavior
  - Verify scroll container has correct CSS classes
  - _Requirements: 2.1, 2.3_

## 3. Checkpoint - Verify theme changes

- [ ] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 4. Convert Chinese Strings to English

- [ ] 4.1 Convert strings in theme-selector.tsx
  - Replace "选择主题" with "Select Theme"
  - Replace "浅色主题" with "Light Themes"
  - Replace "深色主题" with "Dark Themes"
  - Replace "切换过渡动画" with "Enable Transitions"
  - Replace mode labels: "浅色" → "Light", "深色" → "Dark", "跟随系统" → "System"
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.2 Convert strings in emptyProject.tsx
  - Replace "欢迎使用小说编辑器" with "Welcome to Novel Editor"
  - Replace "开始创作你的故事..." with "Start writing your story..."
  - Replace "创建新项目" with "Create New Project"
  - Replace "导入已有项目" with "Import Project"
  - Replace feature card titles and descriptions
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.3 Convert strings in export-button.tsx
  - Replace format labels to English (纯文本→Plain Text, Word 文档→Word Document, etc.)
  - Replace "导出中..." with "Exporting..."
  - Replace "导出" with "Export"
  - Replace "快速导出" with "Quick Export"
  - Replace "高级选项..." with "Advanced Options..."
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.4 Convert strings in activity-bar.tsx
  - Replace "书库 (Ctrl+B)" with "Library (Ctrl+B)"
  - Replace "章节管理" with "Chapters"
  - Replace "Wiki 知识库" with "Wiki"
  - Replace "搜索 (Ctrl+Shift+F)" with "Search (Ctrl+Shift+F)"
  - Replace "大纲" with "Outline"
  - Replace "统计" with "Statistics"
  - Replace "更多" with "More"
  - Replace "导入" with "Import"
  - Replace "导出" with "Export"
  - Replace "删除所有书籍" with "Delete All Books"
  - Replace "设置" with "Settings"
  - Replace toast messages and confirm dialogs
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.5 Convert strings in command-palette.tsx
  - Replace "操作" with "Actions"
  - Replace "全局搜索" with "Global Search"
  - Replace "新建章节" with "New Chapter"
  - Replace "导出作品" with "Export Project"
  - Replace "打开大纲页面" with "Open Outline"
  - Replace "打开 Wiki 知识库" with "Open Wiki"
  - Replace "数据管理" with "Data Management"
  - Replace "备份数据" with "Backup Data"
  - Replace "数据统计" with "Statistics"
  - Replace "设置" with "Settings"
  - Replace "切换到浅色主题/深色主题" with "Switch to Light/Dark Theme"
  - Replace "打开设置" with "Open Settings"
  - Replace search placeholder and other labels
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.6 Convert strings in drawing-workspace.tsx
  - Replace "绘图数据异常，画布尺寸超出限制" with "Drawing data error, canvas size exceeded"
  - Replace "绘图组件加载失败" with "Failed to load drawing component"
  - Replace "重试" with "Retry"
  - Replace "清空重置" with "Clear & Reset"
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.7 Convert remaining Chinese strings in desktop app
  - Search for remaining Chinese characters in src/**/*.tsx
  - Convert all found strings to English equivalents
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 4.8 Write property test for English text verification
  - **Property 5: UI text is English**
  - **Validates: Requirements 3.1**

## 5. Checkpoint - Verify string conversions

- [ ] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 6. Redesign Statistics Page

- [ ] 6.1 Update statistics page header and layout
  - Modernize header design with better typography
  - Add subtle gradient background to header
  - Improve project selector styling
  - _Requirements: 4.1, 4.3_

- [ ] 6.2 Redesign overview cards
  - Add gradient backgrounds to stat cards
  - Improve icon styling with colored backgrounds
  - Add hover effects and subtle shadows
  - Improve number formatting and typography
  - _Requirements: 4.1, 4.3_

- [ ] 6.3 Redesign chapter breakdown section
  - Add gradient progress bars
  - Improve chapter list styling
  - Add better visual hierarchy
  - _Requirements: 4.2, 4.3_

- [ ] 6.4 Redesign scene details section
  - Improve scene list styling
  - Add better ranking indicators
  - Improve typography and spacing
  - _Requirements: 4.1, 4.3_

- [ ] 6.5 Add entrance animations
  - Add staggered fade-in animations for cards
  - Add smooth transitions for progress bars
  - _Requirements: 4.4_

- [ ]* 6.6 Write unit tests for statistics page components
  - Verify cards render with correct classes
  - Verify progress bars have gradient styles
  - _Requirements: 4.1, 4.2_

## 7. Final Checkpoint

- [ ] 7. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
