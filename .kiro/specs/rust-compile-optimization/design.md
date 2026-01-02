# Design Document: Rust 编译优化

## Overview

通过配置快速链接器、优化编译设置、启用编译缓存来显著提升 Rust 后端的编译和测试速度。

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Rust Build Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source Code                                                    │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   rustc     │───▶│  sccache    │───▶│   Cache     │         │
│  │  (编译器)   │    │  (缓存层)   │    │   (磁盘)    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                                │
│  │ Object Files│                                                │
│  │  (.o/.rlib) │                                                │
│  └─────────────┘                                                │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                                │
│  │    mold     │  ← 快速链接器 (比 GNU ld 快 10-20x)            │
│  │  (链接器)   │                                                │
│  └─────────────┘                                                │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                                │
│  │ Executable  │                                                │
│  └─────────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Cargo 配置文件 (`.cargo/config.toml`)

项目级别的 Cargo 配置，定义链接器和构建选项。

```toml
# apps/desktop/src-tauri/.cargo/config.toml

[target.x86_64-unknown-linux-gnu]
# 优先使用 mold，其次 lld，最后默认
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=mold"]

[target.aarch64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=mold"]

# macOS 使用系统链接器（已经很快）
[target.x86_64-apple-darwin]
rustflags = []

[target.aarch64-apple-darwin]
rustflags = []

# Windows 使用 lld
[target.x86_64-pc-windows-msvc]
linker = "lld-link"

[build]
# 使用 sccache 作为编译缓存（如果可用）
# rustc-wrapper = "sccache"

[env]
# 启用增量编译
CARGO_INCREMENTAL = "1"
```

### 2. Cargo Profile 配置 (`Cargo.toml`)

优化开发和发布构建配置。

```toml
# 开发配置 - 优化编译速度
[profile.dev]
opt-level = 0
debug = 1                    # 减少调试信息
incremental = true
codegen-units = 256          # 更多并行单元
split-debuginfo = "unpacked" # Linux 上更快的链接

# 开发依赖 - 使用优化减少运行时开销
[profile.dev.package."*"]
opt-level = 2
debug = false

# 发布配置 - 优化运行性能
[profile.release]
opt-level = 3
lto = "thin"
codegen-units = 1
strip = true

# 测试配置 - 平衡编译速度和运行速度
[profile.test]
opt-level = 1
debug = 1
incremental = true

# 自定义快速检查配置
[profile.dev.build-override]
opt-level = 0
codegen-units = 256
```

### 3. 安装脚本 (`scripts/setup-rust-fast-build.sh`)

一键安装优化工具的脚本。

```bash
#!/bin/bash
# 检测系统并安装 mold 和 sccache

install_mold() {
    if command -v mold &> /dev/null; then
        echo "✓ mold 已安装: $(mold --version)"
        return 0
    fi
    
    # 检测包管理器并安装
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y mold
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm mold
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y mold
    else
        echo "⚠ 请手动安装 mold"
        return 1
    fi
}

install_sccache() {
    if command -v sccache &> /dev/null; then
        echo "✓ sccache 已安装: $(sccache --version)"
        return 0
    fi
    
    cargo install sccache
}
```

## Data Models

### 配置文件结构

```
apps/desktop/src-tauri/
├── .cargo/
│   └── config.toml      # 链接器和构建配置
├── Cargo.toml           # Profile 配置
└── ...

scripts/
└── setup-rust-fast-build.sh  # 安装脚本
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

由于这是配置优化任务，主要验证通过手动测试和基准测试完成，没有需要自动化测试的属性。

验证方式：
1. 编译时间对比（优化前后）
2. 链接器是否正确使用（通过 `cargo build -vv` 查看）
3. 缓存命中率（通过 `sccache --show-stats` 查看）

## Error Handling

| 场景 | 处理方式 |
|------|----------|
| mold 未安装 | 回退到 lld |
| lld 未安装 | 使用默认链接器 |
| sccache 未安装 | 正常编译，无缓存 |
| 配置语法错误 | Cargo 报错，需修复 |

## Testing Strategy

### 手动验证

1. **编译时间基准测试**
   ```bash
   # 清理并完整编译
   cargo clean && time cargo build
   
   # 增量编译（修改一个文件后）
   touch src/lib.rs && time cargo build
   ```

2. **链接器验证**
   ```bash
   # 查看使用的链接器
   cargo build -vv 2>&1 | grep -E "(mold|lld|ld)"
   ```

3. **缓存验证**
   ```bash
   sccache --show-stats
   ```

### 预期改进

| 场景 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| 完整编译 | ~60s | ~40s | 33% |
| 增量编译 | ~15s | ~5s | 67% |
| 链接时间 | ~10s | ~2s | 80% |
