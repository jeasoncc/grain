# Implementation Plan: Rust 编译优化

## Overview

通过配置快速链接器、优化编译设置、启用编译缓存来提升 Rust 编译速度。

## Tasks

- [x] 1. 安装 mold 链接器
  - 检查当前系统是否已安装 mold
  - 使用包管理器安装 mold
  - 验证安装成功
  - _Requirements: 1.1, 1.2_

- [x] 2. 创建项目级 Cargo 配置
  - [x] 2.1 创建 `.cargo/config.toml` 文件
    - 配置 Linux 使用 mold 链接器
    - 配置 Windows 使用 lld 链接器
    - 配置 macOS 使用默认链接器
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. 优化 Cargo.toml Profile 配置
  - [x] 3.1 添加开发 Profile 优化
    - 配置 incremental = true
    - 配置 codegen-units = 256
    - 配置 split-debuginfo = "unpacked"
    - 减少 debug 信息级别
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 3.2 添加依赖 Profile 优化
    - 配置 dev.package."*" 使用 opt-level = 2
    - 禁用依赖的 debug 信息
    - _Requirements: 4.1_
  
  - [x] 3.3 优化 release Profile
    - 配置 LTO = "thin"
    - 配置 strip = true
    - _Requirements: 4.2_

- [x] 4. 创建安装脚本
  - [x] 4.1 创建 `scripts/setup-rust-fast-build.sh`
    - 检测并安装 mold
    - 检测并安装 sccache
    - 支持 Ubuntu/Debian、Arch、Fedora
    - 验证安装并报告状态
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. 迁移全局 Cargo 配置
  - 将 `~/.cargo/config` 重命名为 `~/.cargo/config.toml`
  - 验证配置仍然有效
  - _Requirements: 6.1, 6.2_

- [x] 6. 验证优化效果
  - 运行完整编译并记录时间
  - 运行增量编译并记录时间
  - 验证链接器正确使用
  - 对比优化前后的编译时间
  - _Requirements: 1.1, 2.1_

## Notes

- mold 是目前最快的链接器，但需要单独安装
- sccache 是可选的，但强烈推荐用于加速重复编译
- macOS 的系统链接器已经很快，不需要替换
- Windows 使用 lld-link 作为快速链接器
