# 开发环境配置

## 快速开始

```bash
# 1. 检查环境
bash scripts/check-env.sh

# 2. 自动配置（安装缺失工具）
bash scripts/setup-dev-env.sh

# 3. 加载环境变量
echo "source $(pwd)/.zshrc-grain" >> ~/.zshrc
source ~/.zshrc

# 4. 开始开发
gd  # 启动桌面应用
```

## 文档索引

### 平台特定配置
- [Arch Linux 配置指南](./arch-linux-setup.md) - 完整的 Arch Linux 开发环境配置
- [性能调优指南](./performance-tuning.md) - 编译和运行时性能优化

### 通用配置
- [技术栈](../../.kiro/steering/tech.md) - 项目使用的技术栈
- [项目结构](../../.kiro/steering/structure.md) - 目录结构说明
- [工作流程](../../.kiro/steering/workflow.md) - Git 提交规范和开发流程

## 配置文件说明

| 文件 | 用途 |
|------|------|
| `.bunfig.toml` | Bun 包管理器配置（国内镜像） |
| `.npmrc` | npm 配置（国内镜像） |
| `.cargo/config.toml` | Rust 编译配置（镜像 + 优化） |
| `.zshrc-grain` | 项目专用 shell 配置（别名 + 环境变量） |
| `turbo.json` | Turborepo 构建配置 |

## 常用命令

### 开发
```bash
gd          # bun run desktop:dev
gw          # bun run web:dev
```

### 构建
```bash
gb          # bun run build:prod
```

### 代码质量
```bash
gl          # bun run lint
gc          # bun run check
gt          # bun run test
```

### Rust
```bash
cr          # cargo run (API server)
cb          # cargo build --release
cw          # cargo watch (自动重新编译)
```

### 清理
```bash
clean-all       # 清理所有 node_modules 并重新安装
clean-turbo     # 清理 Turbo 缓存
clean-rust      # 清理 Rust target
```

## 性能优化亮点

### ✅ 已配置
- **Bun 镜像**: 使用 npmmirror 加速依赖下载
- **Cargo 镜像**: 使用 rsproxy 加速 Rust 依赖
- **并行编译**: 使用所有 8 个 CPU 核心
- **mold 链接器**: 比 ld 快 10 倍（已安装）
- **sccache**: 分布式编译缓存（已安装）
- **增量编译**: Rust 增量编译已启用

### 🚀 预期性能提升
- 依赖下载速度: **5-10 倍**（国内镜像）
- Rust 链接时间: **减少 30%**（mold）
- 重复编译时间: **减少 50%**（sccache）
- 整体构建时间: **减少 40%**

## 系统要求

### 最低要求
- CPU: 4 核
- RAM: 8GB
- 磁盘: 30GB

### 推荐配置（你的配置）
- CPU: Intel i7-6700 (8 核 @ 3.40GHz) ✅
- RAM: 15GB ✅
- 磁盘: 233GB (74GB 已用) ✅

## 故障排查

### 常见问题

#### 1. Turbo 未找到
```bash
bun install -g turbo@latest
```

#### 2. Biome 未找到
```bash
bun install -g @biomejs/biome@latest
```

#### 3. 依赖下载慢
检查镜像配置：
```bash
cat .bunfig.toml
cat .npmrc
cat .cargo/config.toml
```

#### 4. 内存不足
```bash
# 增加 Node.js 内存限制（已在 .zshrc-grain 配置）
export NODE_OPTIONS="--max-old-space-size=8192"
```

#### 5. 编译失败
```bash
# 清理并重新构建
clean-all
clean-rust
bun install
cargo build
```

## 下一步

1. **阅读架构文档**: [architecture.md](../../.kiro/steering/architecture.md)
2. **了解数据流**: [data-flow-frontend.md](../../.kiro/steering/data-flow-frontend.md)
3. **查看代码规范**: [code-standards.md](../../.kiro/steering/code-standards.md)
4. **开始开发**: `gd` 启动桌面应用

## 获取帮助

- 查看所有文档: `ls docs/`
- 检查环境: `bash scripts/check-env.sh`
- 查看别名: `alias | grep "^g\|^c\|^clean"`
