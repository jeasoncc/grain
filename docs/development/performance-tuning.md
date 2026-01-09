# 性能调优指南

## 编译性能优化

### Rust 编译优化

#### 1. 并行编译
`.cargo/config.toml` 已配置使用所有 CPU 核心：
```toml
[build]
jobs = 8  # 根据你的 CPU 核心数调整
```

#### 2. 增量编译
```toml
[build]
incremental = true
```

#### 3. 使用 mold 链接器（推荐）
```bash
# 安装 mold（比 ld 快 10 倍）
sudo pacman -S mold

# 在 .cargo/config.toml 添加
[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=mold"]
```

#### 4. 使用 sccache（分布式编译缓存）
```bash
# 安装
cargo install sccache

# 配置环境变量（添加到 .zshrc-grain）
export RUSTC_WRAPPER=sccache
export SCCACHE_DIR=$HOME/.cache/sccache
```

### TypeScript/Vite 编译优化

#### 1. 增加 Node.js 内存
已在 `.zshrc-grain` 配置：
```bash
export NODE_OPTIONS="--max-old-space-size=8192"
```

#### 2. 使用 SWC 替代 Babel
`vite.config.ts` 中使用 `@vitejs/plugin-react-swc`：
```ts
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
})
```

#### 3. 优化 Vite 缓存
```ts
export default defineConfig({
  cacheDir: '.vite',
  optimizeDeps: {
    force: false, // 不强制重新优化
  },
})
```

## 运行时性能优化

### 1. 内存管理

当前系统：15GB RAM，8GB 已使用

#### 监控内存
```bash
# 实时监控
htop

# 查看进程内存
ps aux --sort=-%mem | head -10
```

#### 优化建议
- 关闭 Chrome 多余标签页
- 使用 `cargo build --release` 而非 `cargo build`
- 定期清理 Turbo 缓存

### 2. 磁盘 I/O 优化

#### 使用 tmpfs 加速构建
```bash
# 将 target 目录挂载到内存
sudo mount -t tmpfs -o size=4G tmpfs apps/api-rust/target

# 永久配置（添加到 /etc/fstab）
tmpfs /path/to/grain/apps/api-rust/target tmpfs size=4G,uid=1000,gid=1000 0 0
```

#### 定期清理缓存
```bash
# 清理 Turbo 缓存
clean-turbo

# 清理 Rust target
clean-rust

# 清理 node_modules
clean-all
```

### 3. 网络优化

#### 使用国内镜像
已配置：
- Bun: `.bunfig.toml`
- npm: `.npmrc`
- Cargo: `.cargo/config.toml`

#### 并行下载
```bash
# Cargo 并行下载
export CARGO_NET_GIT_FETCH_WITH_CLI=true

# Bun 并行安装
bun install --concurrent 8
```

## 开发体验优化

### 1. 热重载优化

#### Vite HMR
```ts
export default defineConfig({
  server: {
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false, // 使用 inotify
    },
  },
})
```

#### Cargo Watch
```bash
# 安装
cargo install cargo-watch

# 使用
cw  # 别名：cargo watch -x check -x test
```

### 2. 测试性能

#### 使用 cargo-nextest
```bash
# 安装
cargo install cargo-nextest

# 使用（比 cargo test 快 3 倍）
cargo nextest run
```

#### Vitest 并行测试
```ts
export default defineConfig({
  test: {
    threads: true,
    maxThreads: 8,
  },
})
```

## 系统级优化

### 1. 文件描述符限制
```bash
# 检查当前限制
ulimit -n

# 临时增加
ulimit -n 65536

# 永久配置（添加到 /etc/security/limits.conf）
* soft nofile 65536
* hard nofile 65536
```

### 2. Swap 优化
```bash
# 检查 swap 使用
free -h

# 调整 swappiness（0-100，越小越少使用 swap）
sudo sysctl vm.swappiness=10

# 永久配置（添加到 /etc/sysctl.conf）
vm.swappiness=10
```

### 3. CPU 调度优化
```bash
# 使用 performance 模式
sudo cpupower frequency-set -g performance

# 检查当前模式
cpupower frequency-info
```

## 监控工具

### 1. 系统监控
```bash
# 安装
sudo pacman -S htop btop iotop

# 使用
htop    # CPU/内存监控
btop    # 更美观的监控
iotop   # 磁盘 I/O 监控
```

### 2. 构建监控
```bash
# Turbo 构建统计
turbo run build --summarize

# Cargo 构建时间分析
cargo build --timings
```

### 3. 性能分析
```bash
# Rust 性能分析
cargo install flamegraph
cargo flamegraph

# Node.js 性能分析
node --prof app.js
node --prof-process isolate-*.log
```

## 基准测试

### 当前系统性能
- CPU: Intel i7-6700 (8 cores @ 3.40GHz)
- RAM: 15GB
- Disk: SSD (推测)

### 预期构建时间
- Desktop 开发构建: ~30s
- Desktop 生产构建: ~2min
- Rust API 构建: ~1min
- 全量构建: ~5min

### 优化后预期
- 使用 mold: 减少 30% 链接时间
- 使用 sccache: 减少 50% 重复编译
- 使用 tmpfs: 减少 20% I/O 时间
