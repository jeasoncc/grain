# ✅ 跨平台构建修复

## 🐛 发现的问题

### 问题 1: Windows PowerShell 语法错误

**错误信息**:
```
ParserError: Missing '(' after 'if' in if statement.
if [ ! -d "dist" ]; then
```

**原因**: Windows 使用 PowerShell，不支持 bash 的 `[ ]` 语法。

### 问题 2: macOS 找不到构建产物

**错误信息**:
```
Error: No artifacts were found.
Looking for artifacts in:
/Users/runner/work/novel-editor/novel-editor/apps/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/
```

**原因**: 
1. macOS 构建时使用了 `--target` 参数，产物在 `target/aarch64-apple-darwin/` 或 `target/x86_64-apple-darwin/`
2. 上传路径使用了 `**/*.dmg`，但实际路径更深

## ✅ 修复方案

### 1. 跨平台验证脚本

**修复前** (只支持 Unix):
```yaml
- name: Verify frontend build
  run: |
    if [ ! -d "dist" ]; then
      echo "Frontend build failed"
      exit 1
    fi
```

**修复后** (支持所有平台):
```yaml
# Unix (Linux/macOS)
- name: Verify frontend build (Unix)
  if: runner.os != 'Windows'
  run: |
    if [ ! -d "dist" ]; then
      echo "Frontend build failed: dist directory not found"
      exit 1
    fi
    echo "Frontend build successful"
    ls -la dist/

# Windows
- name: Verify frontend build (Windows)
  if: runner.os == 'Windows'
  shell: pwsh
  run: |
    if (-not (Test-Path "dist")) {
      Write-Error "Frontend build failed: dist directory not found"
      exit 1
    }
    Write-Output "Frontend build successful"
    Get-ChildItem dist/
```

### 2. 平台特定的构建产物路径

**修复前** (通用路径，不准确):
```yaml
- name: Upload build artifacts
  path: |
    apps/desktop/src-tauri/target/release/bundle/**/*.deb
    apps/desktop/src-tauri/target/release/bundle/**/*.dmg
```

**修复后** (平台特定路径):
```yaml
# Linux
- name: Upload build artifacts (Linux)
  if: runner.os == 'Linux'
  path: |
    apps/desktop/src-tauri/target/release/bundle/deb/*.deb
    apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage
    apps/desktop/src-tauri/target/release/bundle/rpm/*.rpm

# macOS (支持多架构)
- name: Upload build artifacts (macOS)
  if: runner.os == 'macOS'
  path: |
    apps/desktop/src-tauri/target/*/release/bundle/dmg/*.dmg
    apps/desktop/src-tauri/target/*/release/bundle/macos/*.app

# Windows
- name: Upload build artifacts (Windows)
  if: runner.os == 'Windows'
  path: |
    apps/desktop/src-tauri/target/release/bundle/msi/*.msi
    apps/desktop/src-tauri/target/release/bundle/nsis/*.exe
```

## 📊 路径说明

### Linux 构建产物

```
apps/desktop/src-tauri/target/release/bundle/
├── deb/
│   └── novel-editor_0.1.0_amd64.deb
├── appimage/
│   └── novel-editor_0.1.0_amd64.AppImage
└── rpm/
    └── novel-editor-0.1.0-1.x86_64.rpm
```

### macOS 构建产物

**ARM (aarch64)**:
```
apps/desktop/src-tauri/target/aarch64-apple-darwin/release/bundle/
├── dmg/
│   └── novel-editor_0.1.0_aarch64.dmg
└── macos/
    └── novel-editor.app
```

**Intel (x86_64)**:
```
apps/desktop/src-tauri/target/x86_64-apple-darwin/release/bundle/
├── dmg/
│   └── novel-editor_0.1.0_x64.dmg
└── macos/
    └── novel-editor.app
```

### Windows 构建产物

```
apps/desktop/src-tauri/target/release/bundle/
├── msi/
│   └── novel-editor_0.1.0_x64_en-US.msi
└── nsis/
    └── novel-editor_0.1.0_x64-setup.exe
```

## 🎯 关键改进

### 1. 使用条件判断

```yaml
if: runner.os == 'Linux'    # 只在 Linux 运行
if: runner.os == 'macOS'    # 只在 macOS 运行
if: runner.os == 'Windows'  # 只在 Windows 运行
if: runner.os != 'Windows'  # 在非 Windows 运行
```

### 2. 指定 Shell

```yaml
# Windows 使用 PowerShell
- name: Some step
  if: runner.os == 'Windows'
  shell: pwsh
  run: |
    # PowerShell 命令

# Unix 使用 bash (默认)
- name: Some step
  if: runner.os != 'Windows'
  run: |
    # Bash 命令
```

### 3. 使用通配符匹配多架构

```yaml
# macOS 多架构支持
path: apps/desktop/src-tauri/target/*/release/bundle/dmg/*.dmg
#                                      ^
#                                      匹配 aarch64-apple-darwin 或 x86_64-apple-darwin
```

## 🧪 测试验证

### 本地测试

```bash
# Linux
cd apps/desktop
bun run build
bun tauri build
ls -la src-tauri/target/release/bundle/

# macOS
cd apps/desktop
bun run build
bun tauri build --target aarch64-apple-darwin
ls -la src-tauri/target/aarch64-apple-darwin/release/bundle/

# Windows (PowerShell)
cd apps/desktop
bun run build
bun tauri build
Get-ChildItem src-tauri/target/release/bundle/
```

## 📋 完整的工作流

### 关键步骤

1. ✅ 安装依赖（所有平台）
2. ✅ 构建前端（所有平台）
3. ✅ 验证构建（平台特定脚本）
4. ✅ 构建 Tauri（所有平台）
5. ✅ 上传产物（平台特定路径）

### 平台矩阵

```yaml
matrix:
  include:
    - platform: 'macos-latest'
      args: '--target aarch64-apple-darwin'
    - platform: 'macos-latest'
      args: '--target x86_64-apple-darwin'
    - platform: 'ubuntu-22.04'
      args: ''
    - platform: 'ubuntu-22.04-arm'
      args: ''
    - platform: 'windows-latest'
      args: ''
```

## ✅ 验证清单

- [x] Windows PowerShell 语法修复
- [x] macOS 多架构路径支持
- [x] Linux 构建产物路径
- [x] 平台特定的验证脚本
- [x] 平台特定的上传路径
- [ ] 测试所有平台构建
- [ ] 验证产物上传成功

## 🎊 预期结果

修复后，每个平台应该：

1. ✅ 成功构建前端
2. ✅ 验证构建结果
3. ✅ 成功构建 Tauri 应用
4. ✅ 找到并上传构建产物
5. ✅ 创建 GitHub Release

## 📚 相关资源

- [GitHub Actions - Runner OS](https://docs.github.com/en/actions/learn-github-actions/contexts#runner-context)
- [Tauri - Building](https://tauri.app/v1/guides/building/)
- [PowerShell vs Bash](https://docs.microsoft.com/en-us/powershell/scripting/learn/ps101/01-getting-started)

---

**跨平台构建现在应该可以正常工作了！** 🚀
