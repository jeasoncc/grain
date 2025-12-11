# Implementation Plan

- [x] 1. 删除编辑页面右侧边栏
  - [x] 1.1 修改 RootComponent 移除右侧边栏状态和逻辑
    - 移除 `rightSidebarOpen` 状态
    - 移除 `SidebarProvider` 的 `open` 和 `onOpenChange` props
    - 移除 localStorage 中右侧边栏状态的读写
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 删除 /log 路由文件
    - 删除 `apps/desktop/src/routes/log.tsx` 文件
    - _Requirements: 3.1, 3.2_

- [x] 2. 调整 Activity Bar 图标顺序和样式
  - [x] 2.1 重新排列 Activity Bar 图标顺序
    - 调整为：书籍管理(1st) → 章节管理(2nd) → Wiki(3rd) → 搜索(4th) → 大纲(5th)
    - 移除绘图按钮从主导航区（绘图通过书籍管理面板访问）
    - _Requirements: 2.1_
  - [x] 2.2 更新图标主题系统确保每个功能使用不同图标
    - 确保 icon-themes.ts 中每个主题的 activityBar 配置正确
    - 书籍管理使用 Library/BookMarked，章节管理使用 FolderTree，Wiki 使用 BookOpen，搜索使用 Search，大纲使用 ListTree
    - _Requirements: 2.2, 2.3, 2.4_
  - [ ]* 2.3 Write property test for icon theme change propagation
    - **Property 1: Icon Theme Change Propagation**
    - **Validates: Requirements 2.3**

- [x] 3. 简化章节管理面板
  - [x] 3.1 移除 ChaptersPanel 中的书籍选择功能
    - 删除 Select 组件和 handleProjectChange 函数
    - 直接使用全局 selectedProjectId 从 useSelectionStore
    - 当无书籍选择时显示提示信息
    - _Requirements: 4.1, 4.3, 4.4_
  - [x] 3.2 移除章节菜单中的新建绘画选项
    - 从 ChapterListItem 的 Popover 菜单中移除 "Add Canvas" 按钮
    - 移除 handleAddCanvasScene 相关代码
    - _Requirements: 5.1, 5.2_
  - [ ]* 3.3 Write property test for chapters panel project synchronization
    - **Property 2: Chapters Panel Project Synchronization**
    - **Validates: Requirements 4.2**

- [ ] 4. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 添加 Git Tag 构建触发脚本
  - [x] 5.1 创建 create-tag.sh 脚本
    - 支持 desktop, snap, aur, all 参数
    - 从 package.json 读取版本号
    - 创建并推送对应格式的 git tag
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 5.2 添加 npm scripts 到 package.json
    - 添加 tag:desktop, tag:snap, tag:aur, tag:all 命令
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 5.3 Write property test for tag version consistency
    - **Property 4: Tag Version Consistency**
    - **Validates: Requirements 6.5**

- [ ] 6. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
