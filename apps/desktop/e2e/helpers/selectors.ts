/**
 * @file selectors.ts
 * @description E2E 测试 UI 选择器常量
 * 
 * 所有 UI 元素的选择器定义，用于 E2E 测试定位元素。
 * 优先使用 data-testid 属性，其次使用 aria 属性或 CSS 选择器。
 */

export const SELECTORS = {
  // ==============================
  // Activity Bar
  // ==============================
  activityBar: '[data-testid="activity-bar"]',
  btnNewDiary: '[data-testid="btn-new-diary"]',
  btnNewWiki: '[data-testid="btn-new-wiki"]',
  btnNewLedger: '[data-testid="btn-new-ledger"]',
  btnNewExcalidraw: '[data-testid="btn-new-excalidraw"]',
  workspaceSelector: '[data-testid="workspace-selector"]',
  
  // ==============================
  // File Tree
  // ==============================
  fileTree: '[data-testid="file-tree"]',
  fileTreeItem: '[data-testid="file-tree-item"]',
  fileTreeItemByNodeId: (nodeId: string) => `[data-testid="file-tree-item"][data-node-id="${nodeId}"]`,
  fileTreeItemByTitle: (title: string) => `[data-testid="file-tree-item"][data-title="${title}"]`,
  fileTreeFolder: '[data-testid="file-tree-folder"]',
  
  // ==============================
  // Editor Tabs
  // ==============================
  editorTabs: '[data-testid="editor-tabs"]',
  editorTab: '[data-testid="editor-tab"]',
  editorTabByNodeId: (nodeId: string) => `[data-testid="editor-tab"][data-node-id="${nodeId}"]`,
  editorTabActive: '[data-testid="editor-tab"][data-active="true"]',
  
  // ==============================
  // Editor
  // ==============================
  editor: '[data-testid="editor"]',
  editorContent: '[data-testid="editor-content"]',
  
  // ==============================
  // Toast (Sonner)
  // ==============================
  toastContainer: '[data-sonner-toaster]',
  toast: '[data-sonner-toast]',
  toastSuccess: '[data-sonner-toast][data-type="success"]',
  toastError: '[data-sonner-toast][data-type="error"]',
  toastInfo: '[data-sonner-toast][data-type="info"]',
  
  // ==============================
  // Dialogs
  // ==============================
  dialog: '[role="dialog"]',
  dialogTitle: '[role="dialog"] [data-testid="dialog-title"]',
  dialogContent: '[role="dialog"] [data-testid="dialog-content"]',
  confirmButton: '[data-testid="confirm-button"]',
  cancelButton: '[data-testid="cancel-button"]',
  
  // Wiki 创建对话框
  wikiTitleInput: '[data-testid="wiki-title-input"]',
  
  // ==============================
  // Sidebar
  // ==============================
  sidebar: '[data-testid="sidebar"]',
  sidebarToggle: '[data-testid="sidebar-toggle"]',
  
  // ==============================
  // Command Palette
  // ==============================
  commandPalette: '[cmdk-root]',
  commandPaletteInput: '[cmdk-input]',
  commandPaletteItem: '[cmdk-item]',
  
  // ==============================
  // 通用
  // ==============================
  loading: '[data-testid="loading"]',
  spinner: '[data-testid="spinner"]',
} as const;

/**
 * 选择器类型
 */
export type SelectorKey = keyof typeof SELECTORS;
