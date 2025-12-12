# 版本系统配置实例

> 📝 **实际示例**: 如何将新文件添加到自动版本号递增系统

## 🎯 示例场景

假设我们需要添加一个新的配置文件 `docker/docker-compose.yml`，它包含版本号信息：

```yaml
version: '3.8'
services:
  novel-editor:
    image: novel-editor:0.1.47  # 这里需要同步版本号
    ports:
      - "3000:3000"
```

## 📋 完整配置步骤

### 步骤 1: 在 `scripts/bump-version.sh` 添加更新函数

找到其他更新函数的位置（约第 130 行），添加：

```bash
# 函数：更新 Docker Compose 中的版本号
update_docker_version() {
    local file=$1
    local new_version=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}警告: 文件不存在，跳过: $file${NC}"
        return 1
    fi
    
    # 更新 image 标签中的版本号
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/novel-editor:[0-9]\+\.[0-9]\+\.[0-9]\+/novel-editor:$new_version/" "$file"
    else
        sed -i "s/novel-editor:[0-9]\+\.[0-9]\+\.[0-9]\+/novel-editor:$new_version/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}
```

### 步骤 2: 在非静默模式中调用函数

找到非静默模式的更新部分（约第 270 行），在 `# 10. Winget manifests` 后添加：

```bash
        # 10. Winget manifests (仅更新版本号，不下载文件)
        update_winget_version "$NEW_VERSION" >&2
        
        # 11. Docker Compose 配置
        update_docker_version "$PROJECT_ROOT/docker/docker-compose.yml" "$NEW_VERSION" >&2
```

### 步骤 3: 在静默模式中调用函数

找到静默模式的更新部分（约第 285 行），在最后添加：

```bash
        update_snap_version "$PROJECT_ROOT/snap/snapcraft.yaml" "$NEW_VERSION" >/dev/null 2>&1
        update_flatpak_version "$PROJECT_ROOT/flatpak/com.lotus.NovelEditor.yml" "$NEW_VERSION" >/dev/null 2>&1
        update_winget_version "$NEW_VERSION" >/dev/null 2>&1
        update_docker_version "$PROJECT_ROOT/docker/docker-compose.yml" "$NEW_VERSION" >/dev/null 2>&1
```

### 步骤 4: 在 pre-commit hook 中添加到暂存区

编辑 `.git/hooks/pre-commit`，找到 `git add` 部分：

```bash
git add \
    package.json \
    apps/desktop/package.json \
    apps/web/package.json \
    apps/desktop/src-tauri/tauri.conf.json \
    apps/desktop/src-tauri/Cargo.toml \
    aur/PKGBUILD \
    aur/PKGBUILD-binary \
    snap/snapcraft.yaml \
    flatpak/com.lotus.NovelEditor.yml \
    winget-manifests/*.yaml \
    docker/docker-compose.yml \
    2>/dev/null || true
```

### 步骤 5: 更新跳过检测逻辑（可选）

如果希望只修改 Docker 文件时跳过版本递增，在 `.git/hooks/pre-commit` 中更新：

```bash
VERSION_FILES="package\.json|tauri\.conf\.json|Cargo\.toml|PKGBUILD|snapcraft\.yaml|winget-manifests/|docker-compose\.yml"
```

## 🧪 测试配置

### 1. 创建测试文件

```bash
mkdir -p docker
cat > docker/docker-compose.yml << EOF
version: '3.8'
services:
  novel-editor:
    image: novel-editor:0.1.47
    ports:
      - "3000:3000"
EOF
```

### 2. 手动测试版本递增

```bash
# 测试版本递增脚本
./scripts/bump-version.sh

# 检查文件是否正确更新
cat docker/docker-compose.yml
# 应该显示: image: novel-editor:0.1.48
```

### 3. 测试完整流程

```bash
# 添加文件到 git
git add docker/docker-compose.yml

# 提交测试（会触发 pre-commit hook）
git commit -m "feat: add docker configuration"

# 检查版本是否正确递增
grep "novel-editor:" docker/docker-compose.yml
```

## 🔍 验证结果

提交后，检查以下内容：

```bash
# 1. 检查主版本号是否递增
grep '"version"' package.json

# 2. 检查 Docker 文件是否更新
grep "novel-editor:" docker/docker-compose.yml

# 3. 检查其他文件是否同步
grep -r "0\.1\." package.json apps/*/package.json aur/PKGBUILD* snap/snapcraft.yaml docker/docker-compose.yml

# 4. 检查 git 状态
git status  # 应该显示 "nothing to commit, working tree clean"
```

## 📝 更多文件格式示例

### Dockerfile
```dockerfile
FROM node:18
LABEL version="0.1.47"
```

**更新函数**:
```bash
update_dockerfile_version() {
    local file=$1
    local new_version=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/LABEL version=\"[^\"]*\"/LABEL version=\"$new_version\"/" "$file"
    else
        sed -i "s/LABEL version=\"[^\"]*\"/LABEL version=\"$new_version\"/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}
```

### Kubernetes Manifest
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: novel-editor
spec:
  template:
    spec:
      containers:
      - name: novel-editor
        image: novel-editor:0.1.47
```

**更新函数**:
```bash
update_k8s_version() {
    local file=$1
    local new_version=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/image: novel-editor:[0-9]\+\.[0-9]\+\.[0-9]\+/image: novel-editor:$new_version/" "$file"
    else
        sed -i "s/image: novel-editor:[0-9]\+\.[0-9]\+\.[0-9]\+/image: novel-editor:$new_version/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}
```

### Python setup.py
```python
setup(
    name="novel-editor",
    version="0.1.47",
    description="Novel Editor"
)
```

**更新函数**:
```bash
update_python_version() {
    local file=$1
    local new_version=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/version=\"[^\"]*\"/version=\"$new_version\"/" "$file"
    else
        sed -i "s/version=\"[^\"]*\"/version=\"$new_version\"/" "$file"
    fi
    
    echo -e "${GREEN}✓${NC} 更新 $file -> $new_version"
}
```

## ⚠️ 常见错误和解决方案

### 错误 1: 文件更新但循环提交
```bash
# 问题: docker/docker-compose.yml 被更新但未添加到暂存区
# 解决: 确保在 .git/hooks/pre-commit 中添加了该文件
git add \
    # ... 其他文件 ...
    docker/docker-compose.yml \  # 必须添加这行
    2>/dev/null || true
```

### 错误 2: sed 命令不匹配
```bash
# 问题: 版本号格式与正则表达式不匹配
# 原文件: image: "novel-editor:0.1.47"  (有引号)
# sed 命令: s/novel-editor:[0-9]/novel-editor:$new_version/  (无引号匹配)

# 解决: 调整正则表达式
sed -i 's/novel-editor:"[^"]*"/novel-editor:"'$new_version'"/' "$file"
```

### 错误 3: 路径错误
```bash
# 问题: 文件路径不正确
update_docker_version "$PROJECT_ROOT/docker/docker-compose.yaml" "$NEW_VERSION"  # 错误: .yaml

# 解决: 检查实际文件扩展名
update_docker_version "$PROJECT_ROOT/docker/docker-compose.yml" "$NEW_VERSION"   # 正确: .yml
```

## 🎯 最佳实践总结

1. **函数命名**: 使用 `update_[类型]_version` 格式
2. **错误处理**: 检查文件是否存在
3. **跨平台**: 支持 macOS 和 Linux 的 sed 语法
4. **输出信息**: 提供清晰的成功/失败反馈
5. **测试验证**: 每次修改后都要测试完整流程
6. **文档更新**: 在相关文档中记录新增的文件

---

通过这个示例，你可以将任何包含版本号的文件添加到自动版本递增系统中。