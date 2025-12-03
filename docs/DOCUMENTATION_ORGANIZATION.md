# 文档整理说明

## 📚 文档结构

所有项目文档已统一整理到 `docs/` 目录下，按类别组织：

```
docs/
├── README.md                    # 文档中心首页
├── project/                     # 项目概述和总结文档
│   ├── README.md
│   ├── QUICKSTART.md
│   ├── PROJECT_OVERVIEW.md
│   └── ... (19个文件)
├── desktop/                     # Desktop 应用文档
│   ├── README.md
│   ├── features/               # 功能文档
│   │   ├── README.md
│   │   └── ... (30个文件)
│   ├── changelog/              # 更新日志
│   │   └── ... (3个文件)
│   └── development/            # 开发文档
│       └── ... (多个文件)
├── web/                        # Web 项目文档
│   └── (待整理)
├── deployment/                 # 部署相关文档
│   ├── README.md
│   └── ... (7个文件)
└── development/                # 开发相关文档
    ├── README.md
    └── ... (17个文件)
```

## 📊 统计信息

- **项目文档**: 19 个文件
- **Desktop 功能文档**: 30+ 个文件
- **部署文档**: 7 个文件
- **开发文档**: 17 个文件

## 🔄 整理规则

### 已整理的文件类型

1. **项目根目录的 .md 文件**
   - 移动到 `docs/project/` (项目概述、快速开始、总结等)
   - 移动到 `docs/deployment/` (部署相关)
   - 移动到 `docs/development/` (开发环境、构建、CI/CD等)

2. **Desktop 项目的文档**
   - 功能文档 → `docs/desktop/features/`
   - 更新日志 → `docs/desktop/changelog/`
   - 开发文档 → `docs/desktop/development/`

### 保持不变的文件

- `README.md` (项目根目录和子项目根目录)
- `apps/desktop/README.md` 和 `README.zh-CN.md`
- 其他子项目的 README 文件

## 🎯 Desktop 项目新功能文档

已整理的新功能文档包括：

### 核心功能
- ✅ 搜索和替换功能（完整文档）
- ✅ 侧边栏切换功能
- ✅ ZIP 导出功能

### 界面和主题
- ✅ 图标主题系统（6种主题）
- ✅ 图标设置功能

### 大纲和图表
- ✅ 大纲系统（完整实现）
- ✅ 图表系统（Mermaid + PlantUML）

### 角色管理
- ✅ 角色提及功能（@ 符号引用）

### 编辑器
- ✅ 内联编辑器设计
- ✅ 现代化编辑器设计

## 📝 文档更新

- ✅ Desktop 项目中文 README 已更新，包含所有新功能说明
- ✅ 创建了完整的文档索引和导航
- ✅ 所有文档按功能分类组织

## 🔗 快速访问

- [文档中心](./README.md)
- [Desktop 文档](./desktop/README.md)
- [项目概述](./project/README.md)
- [部署指南](./deployment/README.md)
- [开发文档](./development/README.md)

---

*最后更新：2024-12-02*

