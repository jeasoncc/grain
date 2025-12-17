# MCP 文档索引

## 📚 文档概览

本目录包含项目 MCP (Model Context Protocol) 的完整文档。

---

## 🚀 快速导航

### 新手入门
1. **[快速开始](./QUICK_START.md)** - 5 分钟快速上手
2. **[完整文档](./README.md)** - 详细的功能说明和使用指南

### 配置和管理
3. **[配置参考](./CONFIGURATION.md)** - 所有配置选项的详细说明
4. **[故障排除](./TROUBLESHOOTING.md)** - 常见问题和解决方案

---

## 📖 文档详情

### 1. README.md - 完整文档
**适合**: 所有用户

**内容**:
- ✅ MCP 服务器概述
- ✅ 浏览器安装状态
- ✅ 配置文件位置
- ✅ 使用方法
- ✅ 常见问题
- ✅ 测试脚本

**何时阅读**: 
- 第一次使用 MCP
- 需要了解完整功能
- 查找特定功能的说明

**阅读时间**: 15-20 分钟

---

### 2. QUICK_START.md - 快速开始
**适合**: 急于开始的用户

**内容**:
- ✅ 5 分钟快速设置
- ✅ 基本命令
- ✅ 快速测试
- ✅ 常用操作

**何时阅读**:
- 想立即开始使用
- 只需要基本功能
- 作为快速参考

**阅读时间**: 5 分钟

---

### 3. CONFIGURATION.md - 配置参考
**适合**: 需要自定义配置的用户

**内容**:
- ✅ 完整配置文件示例
- ✅ 每个选项的详细说明
- ✅ 高级配置技巧
- ✅ 配置优先级
- ✅ 最佳实践

**何时阅读**:
- 需要修改配置
- 添加新的 MCP 服务器
- 优化性能
- 解决配置问题

**阅读时间**: 10-15 分钟

---

### 4. TROUBLESHOOTING.md - 故障排除
**适合**: 遇到问题的用户

**内容**:
- ✅ 浏览器问题
- ✅ 连接问题
- ✅ 配置问题
- ✅ 性能问题
- ✅ 常见错误
- ✅ 调试技巧

**何时阅读**:
- 遇到错误
- 功能不正常
- 需要调试
- 性能问题

**阅读时间**: 根据问题而定

---

## 🎯 按场景选择文档

### 场景 1: 我是新用户，想快速开始
**推荐路径**:
1. [QUICK_START.md](./QUICK_START.md) - 快速设置
2. [README.md](./README.md) - 了解更多功能

---

### 场景 2: 我需要详细了解 MCP
**推荐路径**:
1. [README.md](./README.md) - 完整概述
2. [CONFIGURATION.md](./CONFIGURATION.md) - 配置细节

---

### 场景 3: 我遇到了问题
**推荐路径**:
1. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 查找解决方案
2. [README.md](./README.md) - 确认正确用法

---

### 场景 4: 我想自定义配置
**推荐路径**:
1. [CONFIGURATION.md](./CONFIGURATION.md) - 配置选项
2. [README.md](./README.md) - 验证配置

---

### 场景 5: 我想优化性能
**推荐路径**:
1. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 性能问题部分
2. [CONFIGURATION.md](./CONFIGURATION.md) - 高级配置

---

## 📊 文档状态

| 文档 | 状态 | 最后更新 | 完整度 |
|------|------|----------|--------|
| README.md | ✅ 完成 | 2025-12-17 | 100% |
| QUICK_START.md | ✅ 完成 | 2025-12-17 | 100% |
| CONFIGURATION.md | ✅ 完成 | 2025-12-17 | 100% |
| TROUBLESHOOTING.md | ✅ 完成 | 2025-12-17 | 100% |

---

## 🔗 相关资源

### 项目内部文档
- [MCP 测试清单](../../.kiro/specs/editor-ux-enhancements/mcp-test-checklist.md)
- [浏览器测试报告](../../.kiro/specs/editor-ux-enhancements/browser-test-report.md)
- [手动测试指南](../../.kiro/specs/editor-ux-enhancements/manual-test-guide.md)

### 测试脚本
- `test-browsers.js` - 浏览器兼容性测试
- `playwright-verification.js` - 完整 UI 测试
- `automated-verification.js` - 备用测试脚本

### 外部资源
- [Playwright 官方文档](https://playwright.dev/)
- [Puppeteer 官方文档](https://pptr.dev/)
- [MCP 协议规范](https://modelcontextprotocol.io/)

---

## 💡 使用建议

### 对于 AI Agent
阅读本文档时，请注意:

1. **浏览器已安装**: Chromium 和 Firefox 都已安装并测试通过
2. **不需要重复安装**: 浏览器缓存在 `~/.cache/ms-playwright/`
3. **配置已就绪**: `.kiro/settings/mcp.json` 已正确配置
4. **测试脚本可用**: 可以直接运行测试验证功能

### 对于开发者
1. **先读 QUICK_START**: 快速了解基本用法
2. **参考 README**: 了解完整功能
3. **查看 CONFIGURATION**: 自定义配置
4. **使用 TROUBLESHOOTING**: 解决问题

---

## 📝 文档维护

### 更新频率
- 配置变更时更新
- 新功能添加时更新
- 发现问题时更新

### 贡献指南
如需更新文档:
1. 确保信息准确
2. 保持格式一致
3. 添加示例代码
4. 更新"最后更新"日期

---

## ✅ 快速检查清单

使用 MCP 前，确认:

- [ ] 已阅读 [QUICK_START.md](./QUICK_START.md)
- [ ] 浏览器已安装: `ls ~/.cache/ms-playwright/`
- [ ] 配置文件存在: `cat .kiro/settings/mcp.json`
- [ ] 应用可以启动: `cd apps/desktop && npm run dev`
- [ ] 测试脚本可运行: `bun run test-browsers.js`

---

## 🎓 学习路径

### 初级 (0-1 小时)
1. 阅读 QUICK_START.md
2. 运行测试脚本
3. 尝试基本命令

### 中级 (1-3 小时)
1. 阅读 README.md
2. 了解所有 MCP 服务器
3. 自定义配置

### 高级 (3+ 小时)
1. 阅读 CONFIGURATION.md
2. 优化性能
3. 编写自定义测试脚本
4. 集成到 CI/CD

---

## 📞 获取帮助

### 文档内查找
1. 使用文档内的目录导航
2. 搜索关键词
3. 查看相关章节

### 问题排查
1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. 检查错误日志
3. 运行诊断命令

### 联系支持
如果文档无法解决问题:
1. 收集系统信息
2. 记录错误信息
3. 提供复现步骤

---

**文档版本**: 1.0.0
**最后更新**: 2025-12-17
**维护者**: AI Agent
**状态**: ✅ 生产就绪
