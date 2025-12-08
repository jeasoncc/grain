# Windows 安装指南

## 方式 1：直接下载安装（推荐）

### 下载

访问 [GitHub Releases](https://github.com/jeasoncc/novel-editor/releases/latest)，下载：
- `novel-editor_x.x.x_x64-setup.msi` - 安装版（推荐）
- `novel-editor_x.x.x_x64-setup.exe` - 便携版

### 安装步骤

1. **双击下载的文件**

2. **遇到 SmartScreen 警告？**
   
   这是正常的！因为应用还没有代码签名证书。
   
   **解决方法：**
   ```
   点击 "更多信息" → 点击 "仍要运行"
   ```
   
   ![SmartScreen](https://user-images.githubusercontent.com/xxx/smartscreen.png)

3. **按照安装向导完成安装**

4. **启动应用**
   - 从开始菜单找到 "Novel Editor"
   - 或双击桌面图标

### 为什么会有 SmartScreen 警告？

- 应用是开源的，代码完全透明
- 只是因为没有购买代码签名证书（$300/年）
- 等用户增长后会购买证书消除警告

## 方式 2：使用 Winget（技术用户）

如果你熟悉命令行：

```powershell
# 安装
winget install jeasoncc.NovelEditor

# 更新
winget upgrade jeasoncc.NovelEditor

# 卸载
winget uninstall jeasoncc.NovelEditor
```

## 方式 3：使用 Chocolatey

```powershell
choco install novel-editor
```

## 系统要求

- Windows 10 或更高版本
- 64 位系统
- 至少 100MB 可用空间

## 常见问题

### Q: 安装后找不到应用？
A: 检查开始菜单，搜索 "Novel Editor"

### Q: 杀毒软件报警？
A: 这是误报。应用是开源的，可以查看源代码。添加到白名单即可。

### Q: 如何卸载？
A: 
- 方式 1：设置 → 应用 → 找到 Novel Editor → 卸载
- 方式 2：控制面板 → 程序和功能 → 卸载

### Q: 如何更新？
A: 
- 目前需要手动下载新版本安装
- 未来会添加自动更新功能

### Q: 数据存储在哪里？
A: `C:\Users\你的用户名\AppData\Local\novel-editor\`

## 获取帮助

- [GitHub Issues](https://github.com/jeasoncc/novel-editor/issues)
- [使用文档](https://github.com/jeasoncc/novel-editor/wiki)
- [常见问题](https://github.com/jeasoncc/novel-editor/wiki/FAQ)
