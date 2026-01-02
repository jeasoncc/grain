# Requirements Document

## Introduction

优化 Rust 后端的编译和测试速度。当前 Rust 编译相比 JavaScript 明显较慢，需要通过配置优化、工具升级和构建策略来显著提升开发体验。

## Glossary

- **Linker**: 链接器，将编译后的目标文件链接成可执行文件的工具
- **mold**: 现代高性能链接器，比 GNU ld 快 10-20 倍
- **lld**: LLVM 项目的链接器，比 GNU ld 快 2-5 倍
- **Incremental_Compilation**: 增量编译，只重新编译修改过的代码
- **Cargo_Profile**: Cargo 构建配置文件，定义编译优化级别
- **sccache**: 共享编译缓存，跨项目复用编译结果
- **Codegen_Units**: 代码生成单元，影响并行编译粒度

## Requirements

### Requirement 1: 配置快速链接器

**User Story:** As a developer, I want to use a faster linker, so that I can reduce link time significantly during development.

#### Acceptance Criteria

1. WHEN building in debug mode, THE Build_System SHALL use mold or lld as the linker
2. WHEN mold is not available, THE Build_System SHALL fallback to lld
3. WHEN neither mold nor lld is available, THE Build_System SHALL use the default linker with a warning

### Requirement 2: 优化开发构建配置

**User Story:** As a developer, I want optimized debug build settings, so that I can have faster compile times during development.

#### Acceptance Criteria

1. THE Build_System SHALL configure incremental compilation for debug builds
2. THE Build_System SHALL set appropriate codegen-units for parallel compilation
3. THE Build_System SHALL disable debug symbols in dependencies to reduce link time
4. THE Build_System SHALL configure split-debuginfo for faster linking on Linux

### Requirement 3: 配置编译缓存

**User Story:** As a developer, I want compilation caching, so that I can avoid recompiling unchanged code across builds.

#### Acceptance Criteria

1. WHEN sccache is available, THE Build_System SHALL use it as the compiler wrapper
2. THE Build_System SHALL document sccache installation and configuration steps

### Requirement 4: 优化依赖编译

**User Story:** As a developer, I want optimized dependency compilation, so that I can reduce overall build time.

#### Acceptance Criteria

1. THE Build_System SHALL configure opt-level for dependencies in dev profile
2. THE Build_System SHALL enable LTO only for release builds
3. THE Build_System SHALL configure appropriate panic strategy for each profile

### Requirement 5: 提供安装脚本

**User Story:** As a developer, I want an installation script for optimization tools, so that I can easily set up the optimized build environment.

#### Acceptance Criteria

1. THE Installation_Script SHALL check and install mold if not present
2. THE Installation_Script SHALL check and install sccache if not present
3. THE Installation_Script SHALL verify the installation and report status
4. THE Installation_Script SHALL support common Linux distributions (Ubuntu/Debian, Arch, Fedora)

### Requirement 6: 迁移旧配置文件

**User Story:** As a developer, I want to migrate the deprecated cargo config, so that I can avoid deprecation warnings.

#### Acceptance Criteria

1. THE Migration_Process SHALL rename `~/.cargo/config` to `~/.cargo/config.toml`
2. THE Migration_Process SHALL preserve all existing configuration
