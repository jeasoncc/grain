# Implementation Plan: E2E Creation Testing

## Overview

使用 Puppeteer 实现 Grain 编辑器的 E2E 测试，覆盖 Diary、Wiki、Ledger 和 Excalidraw 四种文件类型的创建流程。每个测试步骤都会截图，并捕获控制台错误进行分析。

## Tasks

- [x] 1. 搭建 E2E 测试基础设施
  - [x] 1.1 创建 E2E 测试目录结构
    - 创建 `apps/desktop/e2e/` 目录
    - 创建子目录：`config/`, `helpers/`, `tests/`, `reports/`, `reports/screenshots/`
    - _Requirements: 1.1_

  - [x] 1.2 创建 Puppeteer 配置文件
    - 创建 `e2e/config/puppeteer.config.ts`
    - 定义 headless、slowMo、viewport、timeout、baseUrl 配置
    - _Requirements: 1.1, 1.2_

  - [x] 1.3 创建 UI 选择器常量文件
    - 创建 `e2e/helpers/selectors.ts`
    - 定义 Activity Bar、File Tree、Editor Tabs、Toast 等选择器
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 1.4 创建浏览器辅助函数
    - 创建 `e2e/helpers/browser.helper.ts`
    - 实现 launch、newPage、navigateToApp、waitForAppReady、close 函数
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 1.5 创建截图辅助函数
    - 创建 `e2e/helpers/screenshot.helper.ts`
    - 实现 screenshotStep 函数，每步操作都截图
    - 截图保存到 `e2e/reports/screenshots/{test-name}/` 目录
    - _Requirements: 1.4, 8.3_

  - [x] 1.6 创建控制台错误捕获辅助函数
    - 创建 `e2e/helpers/console.helper.ts`
    - 实现 setupConsoleListener 函数，捕获所有控制台错误
    - 实现 analyzeConsoleErrors 函数，分析错误并生成报告
    - _Requirements: 8.2, 8.4_

  - [x] 1.7 创建等待策略辅助函数
    - 创建 `e2e/helpers/wait.helper.ts`
    - 实现 waitForSelector、waitForToast、waitForFileTreeItem、waitForEditorTab 函数
    - _Requirements: 1.3_

  - [x] 1.8 创建断言辅助函数
    - 创建 `e2e/helpers/assert.helper.ts`
    - 实现 assertElementExists、assertToastMessage、assertFileInTree、assertTabOpened 函数
    - _Requirements: 3.3, 3.4, 3.5, 4.4, 4.5, 4.6, 5.3, 5.4, 5.5, 6.3, 6.4, 6.5_

- [x] 2. 添加 UI 组件的 data-testid 属性
  - [x] 2.1 更新 Activity Bar 组件
    - 在 `activity-bar.view.fn.tsx` 添加 `data-testid="activity-bar"`
    - 为 New Diary 按钮添加 `data-testid="btn-new-diary"`
    - 为 New Wiki 按钮添加 `data-testid="btn-new-wiki"`
    - 为 New Ledger 按钮添加 `data-testid="btn-new-ledger"`
    - _Requirements: 7.1, 7.2_

  - [x] 2.2 更新 File Tree 组件
    - 在 `file-tree.view.fn.tsx` 添加 `data-testid="file-tree"`
    - 为每个文件项添加 `data-testid="file-tree-item"` 和 `data-node-id`
    - _Requirements: 7.3, 7.4_

  - [x] 2.3 更新 Editor Tabs 组件
    - 在 `editor-tabs.view.fn.tsx` 添加 `data-testid="editor-tabs"`
    - 为每个标签添加 `data-testid="editor-tab"` 和 `data-node-id`
    - _Requirements: 7.5, 7.6_

- [x] 3. 实现 Workspace 初始化测试
  - [x] 3.1 创建 Workspace 测试文件
    - 创建 `e2e/tests/workspace.e2e.ts`
    - 实现测试：验证默认工作区创建
    - 实现测试：验证 Activity Bar 显示
    - 实现测试：验证 File Tree 显示
    - 每步操作截图
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [-] 4. 实现 Diary 创建流程测试
  - [-] 4.1 创建 Diary 测试文件
    - 创建 `e2e/tests/diary.e2e.ts`
    - 实现测试：点击按钮创建日记
    - 实现测试：验证文件夹结构
    - 实现测试：验证文件出现在 File Tree
    - 实现测试：验证自动打开
    - 实现测试：验证 Toast 消息
    - 实现测试：未选择工作区时显示错误
    - 每步操作截图
    - 捕获控制台错误
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 5. 实现 Wiki 创建流程测试
  - [ ] 5.1 创建 Wiki 测试文件
    - 创建 `e2e/tests/wiki.e2e.ts`
    - 实现测试：点击按钮打开对话框
    - 实现测试：输入标题并确认
    - 实现测试：验证文件夹结构
    - 实现测试：验证文件出现在 File Tree
    - 实现测试：验证自动打开
    - 实现测试：验证 Toast 消息
    - 实现测试：取消创建不创建文件
    - 每步操作截图
    - 捕获控制台错误
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 6. 实现 Ledger 创建流程测试
  - [ ] 6.1 创建 Ledger 测试文件
    - 创建 `e2e/tests/ledger.e2e.ts`
    - 实现测试：点击按钮创建记账
    - 实现测试：验证文件夹结构
    - 实现测试：验证文件出现在 File Tree
    - 实现测试：验证自动打开
    - 实现测试：验证 Toast 消息
    - 实现测试：未选择工作区时显示错误
    - 每步操作截图
    - 捕获控制台错误
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. 实现 Excalidraw 创建流程测试
  - [ ] 7.1 创建 Excalidraw 测试文件
    - 创建 `e2e/tests/excalidraw.e2e.ts`
    - 实现测试：触发创建 Excalidraw
    - 实现测试：验证文件夹结构
    - 实现测试：验证文件出现在 File Tree
    - 实现测试：验证自动打开
    - 实现测试：验证 Toast 消息
    - 每步操作截图
    - 捕获控制台错误
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. 创建测试入口和报告生成
  - [ ] 8.1 创建测试入口文件
    - 创建 `e2e/run-e2e.ts`
    - 实现服务器连接检查
    - 实现测试用例执行
    - 实现测试报告生成
    - _Requirements: 1.6, 8.1, 8.5_

  - [ ] 8.2 创建问题记录模板
    - 创建 `e2e/reports/issues.md` 模板
    - 定义问题记录格式
    - _Requirements: 8.2, 8.4_

  - [ ] 8.3 更新 package.json 添加测试脚本
    - 添加 `e2e` 脚本运行所有测试
    - 添加 `e2e:diary`, `e2e:wiki`, `e2e:ledger`, `e2e:excalidraw` 脚本
    - 添加 `e2e:debug` 脚本以非无头模式运行
    - _Requirements: 1.1_

- [ ] 9. Checkpoint - 运行测试并记录问题
  - 运行所有 E2E 测试
  - 检查截图是否正确保存
  - 检查控制台错误是否正确捕获
  - 记录发现的问题到 `e2e/reports/issues.md`
  - 确保所有测试通过，如有问题请询问用户

- [ ] 10. 更新 E2E 文档
  - [ ] 10.1 更新 `.kiro/steering/e2e-testing.md`
    - 添加截图规范
    - 添加控制台错误捕获说明
    - 添加新发现的选择器
    - 添加等待策略
    - 记录测试过程中发现的问题
    - _Requirements: 8.2, 8.4_

## Notes

- 每个测试步骤都必须截图，截图保存在 `e2e/reports/screenshots/{test-name}/` 目录
- 必须捕获并分析开发服务器的控制台错误
- 测试完成后必须更新 `.kiro/steering/e2e-testing.md` 文档
- 运行测试前需要先启动开发服务器：`cd apps/desktop && bun run dev`
