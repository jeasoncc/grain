# E2E 测试错误记录

## 测试日期：2026-01-07

## 测试环境
- Dev Server: http://localhost:1420/ ✅ 运行中
- Rust API: http://127.0.0.1:3030 ✅ 运行中
- 测试模式: Debug (非无头模式)

---

## 错误 1: 所有测试套件超时 - 无法找到 activity-bar 元素

### 错误信息
```
TimeoutError: Waiting for selector `[data-testid="activity-bar"]` failed
Waiting failed: 30000ms exceeded
```

### 影响范围
- ❌ Workspace 测试套件
- ❌ Diary 测试套件
- ❌ Wiki 测试套件
- ❌ Ledger 测试套件（推测）
- ❌ Excalidraw 测试套件（推测）

### 详细堆栈
```
at Function.waitFor (/home/lotus/project/book2/novel-editor/node_modules/puppeteer-core/src/common/QueryHandler.ts:213:36)
at async CdpFrame.waitForSelector (/home/lotus/project/book2/novel-editor/node_modules/puppeteer-core/src/api/Frame.ts:741:13)
at async CdpPage.waitForSelector (/home/lotus/project/book2/novel-editor/node_modules/puppeteer-core/src/api/Page.ts:3058:12)
at async waitForAppReady (/home/lotus/project/book2/novel-editor/apps/desktop/e2e/helpers/browser.helper.ts:89:3)
```

### 问题分析

1. **元素存在性验证** ✅
   - `data-testid="activity-bar"` 存在于代码中
   - 位置：`apps/desktop/src/views/activity-bar/activity-bar.view.fn.tsx:274`

2. **可能的原因**：
   - ❓ 应用初始化失败（JavaScript 错误）
   - ❓ 路由问题（activity-bar 未渲染）
   - ❓ React 渲染错误
   - ❓ 数据加载失败导致组件未挂载
   - ❓ CSS 问题导致元素不可见

3. **需要检查**：
   - [ ] 浏览器控制台错误（JavaScript 错误）
   - [ ] 网络请求失败
   - [ ] React 组件渲染错误
   - [ ] 路由配置问题

### 截图信息
- 应用加载截图：`screenshots/2026-01-07T08-35-24/01-app-loaded.png`
- 失败截图：`screenshots/2026-01-07T08-35-24/99-failure.png`

### 下一步行动

1. **查看失败截图** - 确认页面实际渲染状态
2. **检查浏览器控制台** - 查找 JavaScript 错误
3. **检查网络请求** - 确认 API 调用是否成功
4. **手动测试** - 在浏览器中打开 http://localhost:1420 验证

---

## 测试执行流程

### Workspace 测试套件
```
✅ 浏览器启动成功
✅ 新页面创建成功
✅ 控制台监听器已设置
✅ 导航到 http://localhost:1420
📸 截图: 01-app-loaded.png
⏳ 等待应用加载...
❌ 超时：等待 [data-testid="activity-bar"] 30秒后失败
📸 失败截图: 99-failure.png
✅ 浏览器已关闭
```

### Diary 测试套件
```
✅ 浏览器启动成功
✅ 新页面创建成功
✅ 控制台监听器已设置
✅ 导航到 http://localhost:1420
📸 截图: 01-app-loaded.png
⏳ 等待应用加载...
❌ 超时：等待 [data-testid="activity-bar"] 30秒后失败
📸 失败截图: 99-failure.png
✅ 浏览器已关闭
```

### Wiki 测试套件
```
🚀 开始 Wiki E2E 测试...
✅ 浏览器启动成功
✅ 新页面创建成功
✅ 控制台监听器已设置
✅ 导航到 http://localhost:1420
📸 截图: 01-app-loaded.png
⏳ 等待应用加载...
❌ 超时：等待 [data-testid="activity-bar"] 30秒后失败
📸 失败截图: 99-failure.png
✅ 浏览器已关闭
```

---

## 架构合规性检查

### 相关文件检查

| 文件 | 架构层 | 状态 | 说明 |
|------|--------|------|------|
| `activity-bar.view.fn.tsx` | views/ | ✅ | 有 data-testid 属性 |
| `activity-bar.container.fn.tsx` | views/ | ✅ | Container 组件 |
| `__root.tsx` | routes/ | ❓ | 需要检查路由配置 |

### 可能的架构相关问题

1. **路由初始化** - 检查 `__root.tsx` 是否正确渲染 ActivityBar
2. **状态初始化** - 检查 state/ 层的初始化是否有问题
3. **数据加载** - 检查 flows/ 层的数据加载是否阻塞渲染

---

## 待办事项

- [ ] 查看 e2e 失败截图
- [ ] 检查浏览器控制台日志
- [ ] 手动访问 http://localhost:1420 验证
- [ ] 检查 __root.tsx 路由配置
- [ ] 检查应用初始化流程
- [ ] 修复发现的问题
- [ ] 重新运行 e2e 测试

---

## 结论

E2E 测试失败，所有测试套件都无法找到 `activity-bar` 元素。这表明应用可能没有正确加载或渲染。需要进一步调查：

1. 查看失败截图确认页面状态
2. 检查浏览器控制台是否有 JavaScript 错误
3. 验证路由配置是否正确
4. 确认应用初始化流程

**注意**：这可能不是架构重构引入的问题，需要对比重构前的 e2e 测试结果。
