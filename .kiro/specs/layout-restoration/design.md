# Design Document: Layout Restoration

## Overview

本设计文档定义了 Grain 桌面应用布局系统的完整架构，旨在恢复 v0.1.163 里程碑版本的所有布局功能，同时严格遵循函数式架构模式。

### 设计目标

1. **功能完整性**: 恢复所有历史布局功能
2. **架构合规性**: 遵循 Grain 函数式架构
3. **可维护性**: 清晰的组件分离和依赖关系
4. **可测试性**: 所有核心逻辑可单元测试
5. **性能优化**: 高效的渲染和状态管理

### 核心原则

- **数据流单向**: 数据从 state → hooks → views
- **组件纯函数化**: 视图组件只通过 props 接收数据
- **副作用隔离**: IO 操作集中在 flows 和 io 层
- **状态最小化**: 只存储必要的状态，派生数据通过计算获得

---

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Layout System                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   __root.tsx │  ← 根路由组件
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                      AppLayout                                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ ActivityBar│  │ UnifiedSidebar│  │   Main Content       │ │
│  │  (48px)    │  │  (resizable) │  │   <Outlet />         │ │
│  └────────────┘  └──────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
       │                    │                      │
       ▼                    ▼                      ▼
┌─────────────┐    ┌─────────────┐      ┌─────────────┐
│ ActivityBar │    │  Sidebar    │      │   Routes    │
│  Container  │    │  Container  │      │  (Editor)   │
└─────────────┘    └─────────────┘      └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐    ┌─────────────┐
│   Hooks     │    │   Hooks     │
│ use-layout  │    │ use-sidebar │
└─────────────┘    └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────────────────────────┐
│         State (Zustand)          │
│  - layout.state.ts               │
│  - sidebar.state.ts              │
│  - theme.state.ts                │
└─────────────────────────────────┘
```

### 层次结构

```
routes/__root.tsx
  └─ AppLayout (view)
      ├─ ActivityBar (container)
      │   └─ ActivityBarView (view)
      ├─ UnifiedSidebar (container)
      │   └─ UnifiedSidebarView (view)
      │       ├─ FileTreePanel
      │       ├─ SearchPanel
      │       ├─ DrawingsPanel
      │       └─ TagGraphPanel
      └─ Main Content Area
          └─ <Outlet /> (router)

Global Components (in __root.tsx):
  ├─ CommandPalette (container)
  ├─ GlobalSearch (container)
  ├─ BufferSwitcher (container)
  ├─ ExportDialogManager (container)
  ├─ FontStyleInjector (view)
  ├─ Toaster (view)
  └─ DevtoolsWrapper (view)
```

---

## Components and Interfaces

### 1. AppLayout Component

**职责**: 组织整体布局结构，使用 react-resizable-panels 实现可调整大小的面板系统。

**文件位置**: `apps/desktop/src/views/app-layout/`

#### 接口定义

```typescript
// app-layout.types.ts
export interface AppLayoutProps {
  /** 主内容区域 */
  readonly children: ReactNode;
}
```

#### 组件结构

```typescript
// app-layout.view.fn.tsx
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <ActivityBar />
      
      <PanelGroup 
        direction="horizontal" 
        autoSaveId="grain-main-layout"
      >
        {/* Conditional Sidebar Panel */}
        {isSidebarOpen && activePanel && (
          <>
            <Panel
              id="sidebar"
              order={1}
              defaultSize={20}
              minSize={15}
              maxSize={40}
            >
              <UnifiedSidebar />
            </Panel>
            <PanelResizeHandle />
          </>
        )}
        
        {/* Main Content Panel */}
        <Panel id="main" order={2} defaultSize={80}>
          {children}
        </Panel>
      </PanelGroup>
    </div>
  );
}
```

### 2. ActivityBar Component

**职责**: 左侧固定宽度的操作栏，包含工作区切换、文件操作、快捷创建等功能。

**文件位置**: `apps/desktop/src/views/activity-bar/`

#### 接口定义

```typescript
// activity-bar.types.ts
export interface ActivityBarProps {
  // 数据
  readonly workspaces: WorkspaceInterface[];
  readonly selectedWorkspaceId: string | null;
  readonly activePanel: SidebarPanel | null;
  readonly isSidebarOpen: boolean;
  readonly iconTheme: IconTheme;
  readonly currentPath: string;
  
  // 回调
  readonly onSelectWorkspace: (id: string) => void;
  readonly onCreateWorkspace: (name: string) => Promise<void>;
  readonly onSetActivePanel: (panel: SidebarPanel) => void;
  readonly onToggleSidebar: () => void;
  readonly onCreateDiary: () => Promise<void>;
  readonly onCreateWiki: () => Promise<void>;
  readonly onCreateLedger: () => Promise<void>;
  readonly onCreateTodo: () => Promise<void>;
  readonly onCreateNote: () => Promise<void>;
  readonly onCreateExcalidraw: () => Promise<void>;
  readonly onCreateMermaid: () => Promise<void>;
  readonly onCreatePlantUML: () => Promise<void>;
  readonly onCreateCode: () => Promise<void>;
  readonly onImportFile: (file: File) => Promise<void>;
  readonly onOpenExportDialog: () => void;
  readonly onDeleteAllData: () => Promise<void>;
  readonly onNavigate: (path: string) => void;
}
```

#### 容器组件

```typescript
// activity-bar.container.fn.tsx
export function ActivityBar() {
  // 从 state 获取数据
  const workspaces = useAllWorkspaces();
  const selectedWorkspaceId = useSelectionStore(s => s.selectedWorkspaceId);
  const { activePanel, isOpen } = useUnifiedSidebarStore();
  const iconTheme = useIconTheme();
  const currentPath = useRouter().state.location.pathname;
  
  // 从 flows 获取操作
  const handleCreateWorkspace = useCallback(async (name: string) => {
    await createWorkspaceFlow({ title: name });
  }, []);
  
  const handleCreateDiary = useCallback(async () => {
    if (!selectedWorkspaceId) return;
    await createDiaryFlow({ workspaceId: selectedWorkspaceId });
  }, [selectedWorkspaceId]);
  
  // ... 其他回调
  
  return (
    <ActivityBarView
      workspaces={workspaces}
      selectedWorkspaceId={selectedWorkspaceId}
      activePanel={activePanel}
      isSidebarOpen={isOpen}
      iconTheme={iconTheme}
      currentPath={currentPath}
      onSelectWorkspace={handleSelectWorkspace}
      onCreateWorkspace={handleCreateWorkspace}
      // ... 其他 props
    />
  );
}
```

### 3. UnifiedSidebar Component

**职责**: 可折叠的侧边栏，根据 activePanel 显示不同的面板内容。

**文件位置**: `apps/desktop/src/views/unified-sidebar/`

#### 接口定义

```typescript
// unified-sidebar.types.ts
export interface UnifiedSidebarProps {
  readonly activePanel: SidebarPanel | null;
  readonly isOpen: boolean;
  readonly wasCollapsedByDrag: boolean;
  readonly workspaceId: string | null;
  readonly drawings: NodeInterface[];
  readonly selectedDrawingId: string | null;
  readonly onRestoreFromCollapse: () => void;
  readonly onSelectDrawing: (drawing: NodeInterface) => void;
  readonly onCreateDrawing: () => Promise<void>;
  readonly onDeleteDrawing: (id: string, name: string) => Promise<void>;
}

export type SidebarPanel = 'files' | 'search' | 'drawings' | 'tags';
```

### 4. Global Components

#### CommandPalette

**职责**: 命令面板，提供快速命令执行功能。

```typescript
// command-palette.types.ts
export interface CommandPaletteProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly workspaces: WorkspaceInterface[];
  readonly selectedWorkspaceId: string | null;
}
```

#### GlobalSearch

**职责**: 全局搜索面板，搜索所有文档内容。

```typescript
// global-search.types.ts
export interface GlobalSearchProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}
```

#### BufferSwitcher

**职责**: 标签页切换器，类似 Emacs 的 buffer 切换。

```typescript
// buffer-switcher.types.ts
export interface BufferSwitcherProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly tabs: EditorTab[];
  readonly activeTabId: string | null;
  readonly onSelectTab: (tabId: string) => void;
  readonly initialDirection: 'forward' | 'backward';
}
```

---

## Data Models

### Layout State

```typescript
// types/layout.interface.ts
export interface LayoutState {
  /** 侧边栏是否打开 */
  readonly isSidebarOpen: boolean;
  
  /** 当前激活的面板 */
  readonly activePanel: SidebarPanel | null;
  
  /** 是否通过拖拽折叠 */
  readonly wasCollapsedByDrag: boolean;
  
  /** 侧边栏宽度百分比 */
  readonly sidebarWidth: number;
}

// state/layout.state.ts
export const useLayoutStore = create<LayoutState & LayoutActions>((set) => ({
  isSidebarOpen: true,
  activePanel: 'files',
  wasCollapsedByDrag: false,
  sidebarWidth: 20,
  
  setActivePanel: (panel) => set({ activePanel: panel, isSidebarOpen: true }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarCollapsedByDrag: (collapsed) => set({ wasCollapsedByDrag: collapsed }),
  restoreFromCollapse: () => set({ isSidebarOpen: true, wasCollapsedByDrag: false }),
}));
```

### Theme State

```typescript
// types/theme.interface.ts
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  readonly mode: ThemeMode;
  readonly systemTheme: 'light' | 'dark';
  readonly effectiveTheme: 'light' | 'dark';
}

// state/theme.state.ts
export const useThemeStore = create<ThemeState & ThemeActions>((set, get) => ({
  mode: 'system',
  systemTheme: 'light',
  effectiveTheme: 'light',
  
  setMode: (mode) => {
    set({ mode });
    const { systemTheme } = get();
    const effectiveTheme = mode === 'system' ? systemTheme : mode;
    set({ effectiveTheme });
    applyTheme(effectiveTheme);
  },
  
  setSystemTheme: (systemTheme) => {
    set({ systemTheme });
    const { mode } = get();
    if (mode === 'system') {
      set({ effectiveTheme: systemTheme });
      applyTheme(systemTheme);
    }
  },
}));
```

### Global Component State

```typescript
// types/global-ui.interface.ts
export interface GlobalUIState {
  readonly commandPaletteOpen: boolean;
  readonly globalSearchOpen: boolean;
  readonly bufferSwitcherOpen: boolean;
  readonly bufferSwitcherDirection: 'forward' | 'backward';
  readonly exportDialogOpen: boolean;
}

// state/global-ui.state.ts
export const useGlobalUIStore = create<GlobalUIState & GlobalUIActions>((set) => ({
  commandPaletteOpen: false,
  globalSearchOpen: false,
  bufferSwitcherOpen: false,
  bufferSwitcherDirection: 'forward',
  exportDialogOpen: false,
  
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleGlobalSearch: () => set((state) => ({ globalSearchOpen: !state.globalSearchOpen })),
  openBufferSwitcher: (direction) => set({ bufferSwitcherOpen: true, bufferSwitcherDirection: direction }),
  closeBufferSwitcher: () => set({ bufferSwitcherOpen: false }),
  toggleExportDialog: () => set((state) => ({ exportDialogOpen: !state.exportDialogOpen })),
}));
```

---

## Correctness Properties

*正确性属性是关于系统行为的形式化陈述，可以通过自动化测试验证。每个属性都应该对所有有效输入成立。*

### Property 1: 布局状态持久化

*For any* 布局状态（侧边栏开关、激活面板、侧边栏宽度），当用户调整后，重新打开应用时应该恢复到相同的状态。

**Validates: Requirements 1.2, 1.3, 13.1, 13.2, 13.3**

### Property 2: 面板拖拽调整

*For any* 有效的拖拽操作（在 minSize 和 maxSize 之间），侧边栏宽度应该实时更新，并且主内容区应该相应调整。

**Validates: Requirements 1.1, 1.4**

### Property 3: 拖拽折叠恢复

*For any* 通过拖拽折叠的侧边栏，点击恢复按钮后应该恢复到默认宽度（20%）。

**Validates: Requirements 1.5, 1.6**

### Property 4: 快捷键响应

*For any* 注册的全局快捷键，按下时应该触发对应的操作，并且不应该与浏览器默认行为冲突。

**Validates: Requirements 3.1, 4.1, 5.1, 5.2, 11.1**

### Property 5: 命令面板搜索

*For any* 搜索关键词，命令面板应该返回所有匹配的命令，并且按相关性排序。

**Validates: Requirements 3.3**

### Property 6: 全局搜索结果

*For any* 搜索关键词，全局搜索应该返回所有包含该关键词的文档，并且高亮匹配内容。

**Validates: Requirements 4.3, 4.5**

### Property 7: 标签页切换循环

*For any* 标签页列表，持续按 Ctrl+Tab 应该循环选择标签页，释放 Ctrl 后切换到选中的标签页。

**Validates: Requirements 5.4, 5.5**

### Property 8: Toast 自动消失

*For any* Toast 通知，显示后应该在 3 秒后自动消失，除非用户手动关闭。

**Validates: Requirements 8.4**

### Property 9: 主题系统同步

*For any* 系统主题变化，应用主题应该自动同步更新，除非用户手动设置了主题。

**Validates: Requirements 9.3, 9.4**

### Property 10: 备份定时执行

*For any* 启用自动备份的情况，备份操作应该按设定的时间间隔执行，并记录备份结果。

**Validates: Requirements 10.3, 10.4**

### Property 11: 面板切换状态

*For any* 面板切换操作，如果目标面板已激活且侧边栏已打开，则折叠侧边栏；否则展开侧边栏并激活目标面板。

**Validates: Requirements 11.1, 11.2, 11.3**

### Property 12: 响应式布局约束

*For any* 窗口大小变化，侧边栏宽度不应超过窗口宽度的 50%，主内容区宽度不应小于 400px。

**Validates: Requirements 15.3, 15.4**

---

## Error Handling

### 布局状态加载失败

**场景**: localStorage 中的布局状态损坏或不可用

**处理策略**:
1. 捕获解析错误
2. 记录错误日志
3. 使用默认布局状态
4. 清除损坏的数据

```typescript
// flows/layout/load-layout-state.flow.ts
export const loadLayoutStateFlow = (): Either<Error, LayoutState> => {
  return pipe(
    loadFromStorage('layout-state'),
    E.chain(validateLayoutState),
    E.mapLeft((error) => {
      logger.error('[Layout] Failed to load layout state', error);
      clearStorage('layout-state');
      return error;
    }),
    E.getOrElse(() => getDefaultLayoutState())
  );
};
```

### 快捷键冲突

**场景**: 注册的快捷键与浏览器或其他扩展冲突

**处理策略**:
1. 使用 `event.preventDefault()` 阻止默认行为
2. 检查事件是否已被处理
3. 记录冲突日志
4. 提供快捷键自定义功能（未来）

### 面板调整越界

**场景**: 用户尝试将面板调整到超出限制的大小

**处理策略**:
1. react-resizable-panels 自动限制在 minSize 和 maxSize 之间
2. 监听 onLayout 事件验证布局有效性
3. 如果检测到无效布局，重置为默认值

### 主题加载失败

**场景**: 主题文件加载失败或主题配置无效

**处理策略**:
1. 降级到默认主题
2. 记录错误日志
3. 显示 Toast 通知用户
4. 不阻塞应用启动

---

## Testing Strategy

### 单元测试

**测试范围**:
- 所有纯函数（pipes/, utils/）
- 所有状态操作（state/）
- 所有数据转换逻辑

**测试工具**: Vitest

**示例**:

```typescript
// state/layout.state.test.ts
describe('LayoutStore', () => {
  it('should toggle sidebar', () => {
    const store = useLayoutStore.getState();
    const initialState = store.isSidebarOpen;
    
    store.toggleSidebar();
    expect(store.isSidebarOpen).toBe(!initialState);
    
    store.toggleSidebar();
    expect(store.isSidebarOpen).toBe(initialState);
  });
  
  it('should set active panel and open sidebar', () => {
    const store = useLayoutStore.getState();
    store.setActivePanel('search');
    
    expect(store.activePanel).toBe('search');
    expect(store.isSidebarOpen).toBe(true);
  });
});
```

### 属性测试

**测试范围**:
- 布局状态持久化
- 面板调整约束
- 快捷键响应

**测试工具**: fast-check (property-based testing)

**示例**:

```typescript
// flows/layout/save-layout-state.flow.test.ts
import fc from 'fast-check';

describe('Layout State Persistence', () => {
  it('should round-trip layout state', () => {
    fc.assert(
      fc.property(
        fc.record({
          isSidebarOpen: fc.boolean(),
          activePanel: fc.constantFrom('files', 'search', 'drawings', 'tags', null),
          sidebarWidth: fc.integer({ min: 15, max: 40 }),
        }),
        (layoutState) => {
          // Save
          saveLayoutStateFlow(layoutState);
          
          // Load
          const loaded = loadLayoutStateFlow();
          
          // Verify
          expect(loaded).toEqual(layoutState);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 集成测试

**测试范围**:
- 组件交互
- 快捷键触发
- 状态同步

**测试工具**: Vitest + Testing Library

**示例**:

```typescript
// views/app-layout/app-layout.integration.test.tsx
describe('AppLayout Integration', () => {
  it('should toggle sidebar with Ctrl+B', async () => {
    render(<AppLayout><div>Content</div></AppLayout>);
    
    const sidebar = screen.queryByTestId('unified-sidebar');
    expect(sidebar).toBeInTheDocument();
    
    // Press Ctrl+B
    await userEvent.keyboard('{Control>}b{/Control}');
    
    expect(screen.queryByTestId('unified-sidebar')).not.toBeInTheDocument();
  });
});
```

### E2E 测试

**测试范围**:
- 完整用户流程
- 跨组件交互
- 持久化验证

**测试工具**: Playwright

**示例**:

```typescript
// e2e/layout.spec.ts
test('should persist layout state across sessions', async ({ page }) => {
  // Open app
  await page.goto('/');
  
  // Adjust sidebar width
  const handle = page.locator('[data-panel-resize-handle-id]');
  await handle.dragTo(page.locator('body'), { targetPosition: { x: 400, y: 300 } });
  
  // Reload page
  await page.reload();
  
  // Verify sidebar width is restored
  const sidebar = page.locator('[data-panel-id="sidebar"]');
  const width = await sidebar.evaluate(el => el.getBoundingClientRect().width);
  expect(width).toBeCloseTo(400, 10);
});
```

### 测试覆盖率目标

- **单元测试**: > 80%
- **属性测试**: 所有核心正确性属性
- **集成测试**: 所有主要用户流程
- **E2E 测试**: 关键业务场景

---

## Implementation Notes

### 依赖安装

```bash
# 如果未安装 react-resizable-panels
bun add react-resizable-panels

# 如果未安装 property-based testing
bun add -D fast-check
```

### 文件创建顺序

1. **Types** - 定义所有接口和类型
2. **State** - 创建状态管理
3. **Flows** - 实现业务流程
4. **Hooks** - 创建 React hooks
5. **Views** - 实现视图组件
6. **Containers** - 实现容器组件
7. **Routes** - 更新路由组件
8. **Tests** - 编写测试

### 迁移策略

**阶段 1: 核心布局**
- 更新 AppLayout 使用 PanelGroup
- 添加 PanelResizeHandle
- 实现布局状态持久化

**阶段 2: 全局组件**
- 在 __root.tsx 添加全局组件
- 实现全局状态管理
- 添加组件开关逻辑

**阶段 3: 快捷键**
- 注册全局快捷键监听
- 实现快捷键处理逻辑
- 添加快捷键冲突检测

**阶段 4: 初始化**
- 添加主题系统初始化
- 添加自动备份初始化
- 添加字体样式注入

**阶段 5: 测试和优化**
- 编写单元测试
- 编写属性测试
- 性能优化
- 代码审查

### 性能优化

1. **组件 memo 化**: 使用 React.memo 避免不必要的重渲染
2. **回调稳定化**: 使用 useCallback 稳定回调函数
3. **状态选择器**: 使用 Zustand 选择器只订阅需要的状态
4. **懒加载**: 全局组件按需加载
5. **虚拟化**: 大列表使用虚拟滚动

### 架构合规性检查

每次创建或修改文件后，Agent Hook 会自动检查：
- 文件是否放在正确的目录
- 是否遵循命名规范
- 是否违反依赖规则
- 视图组件是否为纯展示组件
- 是否有对应的测试文件

---

## References

- [React Resizable Panels Documentation](https://github.com/bvaughn/react-resizable-panels)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [TanStack Router Documentation](https://tanstack.com/router)
- [fast-check Documentation](https://fast-check.dev/)
- [Grain Architecture Documentation](.kiro/steering/architecture.md)
