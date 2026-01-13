# GRAIN-ARCHITECTURE 问题报告

共 285 个问题

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/file/create-file.flow.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 23 行，第 1 列

**消息**: ❌ 架构层级违规：flows/ 层不能依赖 flows/ 层

🔍 原因：
  当前文件位于 流程层，但导入了 流程层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  flows/ 只能依赖: pipes, io, state, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// flows/ 不能依赖 flows/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/file/open-file.flow.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 23 行，第 1 列

**消息**: ❌ 架构层级违规：flows/ 层不能依赖 flows/ 层

🔍 原因：
  当前文件位于 流程层，但导入了 流程层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  flows/ 只能依赖: pipes, io, state, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// flows/ 不能依赖 flows/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/templated/create-templated-file.flow.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 27 行，第 1 列

**消息**: ❌ 架构层级违规：flows/ 层不能依赖 flows/ 层

🔍 原因：
  当前文件位于 流程层，但导入了 流程层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  flows/ 只能依赖: pipes, io, state, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// flows/ 不能依赖 flows/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 28 行，第 1 列

**消息**: ❌ 架构层级违规：flows/ 层不能依赖 flows/ 层

🔍 原因：
  当前文件位于 流程层，但导入了 流程层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  flows/ 只能依赖: pipes, io, state, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// flows/ 不能依赖 flows/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/flows/wiki/migrate-wiki.flow.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 17 行，第 1 列

**消息**: ❌ 架构层级违规：flows/ 层不能依赖 flows/ 层

🔍 原因：
  当前文件位于 流程层，但导入了 流程层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  flows/ 只能依赖: pipes, io, state, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// flows/ 不能依赖 flows/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/queries/attachment.queries.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/queries/content.queries.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/queries/node.queries.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/queries/tag.queries.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/queries/user.queries.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/queries/workspace.queries.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-attachment.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 11 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-backup-manager.ts

共 3 个问题

### ❌ grain/layer-dependencies

**位置**: 第 12 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

### ❌ grain/layer-dependencies

**位置**: 第 24 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

### ❌ grain/layer-dependencies

**位置**: 第 28 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-content.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-drawing.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 21 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 25 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-node.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 16 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-optimistic-collapse.ts

共 3 个问题

### ❌ grain/layer-dependencies

**位置**: 第 17 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 18 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

### ❌ grain/layer-dependencies

**位置**: 第 19 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-tag.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 11 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-unified-save.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 21 行，第 1 列

**消息**: ❌ hooks/ 层不能直接依赖 io/

🔍 原因：
  hooks/ 应该通过 flows/ 间接访问 IO 操作。
  或者使用 queries/ (TanStack Query) 进行数据获取。

✅ 修复方案：
  1. 创建 flow 封装 IO 操作
  2. 或使用 queries/ 进行数据获取

📋 正确的数据流：
  hooks/ → flows/ → io/
  hooks/ → queries/ → io/

📚 参考文档：#architecture - 绑定层

---

### ❌ grain/layer-dependencies

**位置**: 第 25 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-user.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 11 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-wiki.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/hooks/use-workspace.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 16 行，第 1 列

**消息**: ❌ 架构层级违规：hooks/ 层不能依赖 hooks/ 层

🔍 原因：
  当前文件位于 绑定层，但导入了 绑定层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  hooks/ 只能依赖: flows, state, queries, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// hooks/ 不能依赖 hooks/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/api/clear-data.api.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：io/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 IO 层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  io/ 只能依赖: types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// io/ 不能依赖 io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/api/client.api.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 20 行，第 1 列

**消息**: ❌ 架构层级违规：io/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 IO 层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  io/ 只能依赖: types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// io/ 不能依赖 io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/api/content.api.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 11 行，第 1 列

**消息**: ❌ 架构层级违规：io/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 IO 层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  io/ 只能依赖: types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// io/ 不能依赖 io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/api/node.api.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 24 行，第 1 列

**消息**: ❌ 架构层级违规：io/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 IO 层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  io/ 只能依赖: types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// io/ 不能依赖 io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/file/dialog.file.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ 架构层级违规：io/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 IO 层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  io/ 只能依赖: types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// io/ 不能依赖 io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/storage/layout.storage.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：io/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 IO 层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  io/ 只能依赖: types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// io/ 不能依赖 io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/io/storage/settings.storage.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：io/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 IO 层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  io/ 只能依赖: types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// io/ 不能依赖 io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/content/content.generate.fn.ts

共 4 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 703 行，第 41 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 716 行，第 22 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 735 行，第 41 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 750 行，第 22 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/content/excalidraw.content.fn.ts

共 2 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 173 行，第 8 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 176 行，第 24 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.bundle.fn.ts

共 5 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ 架构层级违规：pipes/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 管道层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  pipes/ 只能依赖: utils, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// pipes/ 不能依赖 pipes/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 14 行，第 1 列

**消息**: ❌ 架构层级违规：pipes/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 管道层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  pipes/ 只能依赖: utils, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// pipes/ 不能依赖 pipes/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 82 行，第 8 列

**消息**: ❌ 管道层 (pipes/) 禁止使用 async 函数

🔍 原因：
  纯函数应该是同步的，异步操作属于副作用。
  async 函数会引入不确定性和时序依赖。

🔄 异步操作处理：
  - 将异步操作移动到 flows/ 层
  - 使用 TaskEither 处理异步流程
  - 让 pipes/ 只处理数据转换

✅ 正确的架构：
  flows/ → 异步操作 + 调用 pipes/
  pipes/ → 纯数据转换

📚 参考文档：#fp-patterns - TaskEither

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 83 行，第 17 列

**消息**: ❌ 管道层 (pipes/) 禁止使用 await 表达式

🔍 原因：
  await 表示异步操作，纯函数层不应包含异步代码。

✅ 修复方案：
  将包含 await 的代码移动到 flows/ 层

📚 参考文档：#architecture - 流程层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 86 行，第 9 列

**消息**: ❌ 管道层 (pipes/) 禁止使用 await 表达式

🔍 原因：
  await 表示异步操作，纯函数层不应包含异步代码。

✅ 修复方案：
  将包含 await 的代码移动到 flows/ 层

📚 参考文档：#architecture - 流程层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.json.fn.ts

共 11 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 125 行，第 2 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 133 行，第 12 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 145 行，第 2 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 151 行，第 25 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 154 行，第 24 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 172 行，第 10 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 174 行，第 44 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 177 行，第 27 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 195 行，第 10 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 195 行，第 39 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 213 行，第 3 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.markdown.fn.ts

共 4 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 353 行，第 2 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 372 行，第 22 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 400 行，第 10 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 400 行，第 49 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/export.orgmode.fn.ts

共 4 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 359 行，第 2 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 375 行，第 22 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 403 行，第 10 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 403 行，第 48 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/export/index.ts

共 1 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 99 行，第 8 列

**消息**: ❌ 管道层 (pipes/) 禁止使用 async 函数

🔍 原因：
  纯函数应该是同步的，异步操作属于副作用。
  async 函数会引入不确定性和时序依赖。

🔄 异步操作处理：
  - 将异步操作移动到 flows/ 层
  - 使用 TaskEither 处理异步流程
  - 让 pipes/ 只处理数据转换

��� 正确的架构：
  flows/ → 异步操作 + 调用 pipes/
  pipes/ → 纯数据转换

📚 参考文档：#fp-patterns - TaskEither

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/import/import.file.fn.ts

共 3 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 36 行，第 9 列

**消息**: ❌ 管道层 (pipes/) 禁止创建 Promise

🔍 原因：
  Promise 表示异步操作，纯函数层不应包含异步代码。
  new Promise() 会引入副作用和不确定性。

✅ 修复方案：
  1. 将 Promise 相关代码移动到 flows/ 层
  2. 使用 TaskEither 替代 Promise

📚 参考文档：#fp-patterns - TaskEither

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 50 行，第 8 列

**消息**: ❌ 管道层 (pipes/) 禁止使用 async 函数

🔍 原因：
  纯函数应该是同步的，异步操作属于副作用。
  async 函数会引入不确定性和时序依赖。

🔄 异步操作处理：
  - 将异步操作移动到 flows/ 层
  - 使用 TaskEither 处理异步流程
  - 让 pipes/ 只处理数据转换

✅ 正确的架构：
  flows/ → 异步操作 + 调用 pipes/
  pipes/ → 纯数据转换

📚 参考文档：#fp-patterns - TaskEither

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 54 行，第 19 列

**消息**: ❌ 管道层 (pipes/) 禁止使用 await 表达式

🔍 原因：
  await 表示异步操作，纯函数层不应包含异步代码。

✅ 修复方案：
  将包含 await 的代码移动到 flows/ 层

📚 参考文档：#architecture - 流程层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/import/import.markdown.fn.ts

共 4 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 58 行，第 11 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 492 行，第 9 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 496 行，第 25 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 506 行，第 4 列

**消息**: ❌ 管道层 (pipes/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/import/index.ts

共 1 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 82 行，第 8 列

**消息**: ❌ 管道层 (pipes/) 禁止使用 async 函数

🔍 原因：
  纯函数应该是同步的，异步操作属于副作用。
  async 函数会引入不确定性和时序依赖。

🔄 异步操作处理：
  - 将异步操作移动到 flows/ 层
  - 使用 TaskEither 处理异步流程
  - 让 pipes/ 只处理数据转换

✅ 正确的架构：
  flows/ → 异步操作 + 调用 pipes/
  pipes/ → 纯数据转换

📚 参考文档：#fp-patterns - TaskEither

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/pipes/log/log-creation.pipe.ts

共 2 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 143 行，第 5 列

**消息**: ❌ 管道层 (pipes/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 143 行，第 5 列

**消息**: ❌ 管道层 (pipes/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/__root.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 21 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 state/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 状态层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 state/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 10 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/design.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 6 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/diagrams.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 state/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 状态层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 state/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/editor.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 state/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 状态层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 state/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 state/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 状态层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 state/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/export.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 pipes/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/general.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 12 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 state/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 状态层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 state/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/icons.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 state/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 状态层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 state/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/logs.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 16 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 17 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/routes/settings/typography.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ❌ 架构层级违规：routes/ 层不能依赖 state/ 层

🔍 原因：
  当前文件位于 路由层，但导入了 状态层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  routes/ 只能依赖: views, hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// routes/ 不能依赖 state/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/codec/attachment.codec.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 18 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 24 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/codec/content.codec.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/codec/node.codec.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/codec/tag.codec.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 18 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 24 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/codec/user.codec.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 18 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// ���检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 26 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/codec/workspace.codec.ts

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 10 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/editor-tab/editor-tab.interface.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/node/node.interface.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 11 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/types/node/node.schema.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 12 行，第 1 列

**消息**: ❌ 架构层级违规：types/ 层不能依赖 types/ 层

🔍 原因：
  当前文件位于 类型层，但导入了 类型层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  types/ 只能依赖: 无（只能依赖 types/）

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// types/ 不能依赖 types/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/utils/file-tree-navigation.util.ts

共 27 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 67 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 67 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 81 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 81 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 104 行，第 8 列

**消息**: ❌ 工具层 (utils/) 禁止使用 async 函数

🔍 原因：
  纯函数应该是同步的，异步操作属于副作用。
  async 函数会引入不确定性和时序依赖。

🔄 异步操作处理：
  - 将异步操作移动到 flows/ 层
  - 使用 TaskEither 处理异步流程
  - 让 pipes/ 只处理数据转换

✅ 正确的架构：
  flows/ → 异步操作 + 调用 pipes/
  pipes/ → 纯数据转换

📚 参考文档：#fp-patterns - TaskEither

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 116 行，第 20 列

**消息**: ❌ 工具层 (utils/) 禁止使用 await 表达式

🔍 原因：
  await 表示异步操作，纯函数层不应包含异步代码。

✅ 修复方案：
  将包含 await 的代码移动到 flows/ 层

📚 参考文档：#architecture - 流程层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 118 行，第 5 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 118 行，第 5 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 125 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 125 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 158 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 158 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 168 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 168 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 173 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 173 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 203 行，第 8 列

**消息**: ❌ 工具层 (utils/) 禁止使用 async 函数

🔍 原因：
  纯函数应该是同步的，异步操作属于副作用。
  async 函数会引入不确定性和时序依赖。

🔄 异步操作处理：
  - 将异步操作移动到 flows/ 层
  - 使用 TaskEither 处理异步流程
  - 让 pipes/ 只处理数据转换

✅ 正确的架构：
  flows/ → 异步操作 + 调用 pipes/
  pipes/ → 纯数据转换

📚 参考文档：#fp-patterns - TaskEither

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 213 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 213 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 220 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 220 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 230 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止使用 await 表达式

🔍 原因：
  await 表示异步操作，纯函数层不应包含异步代码。

✅ 修复方案：
  将包含 await 的代码移动到 flows/ 层

📚 参考文档：#architecture - 流程层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 235 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止使用 await 表达式

🔍 原因：
  await 表示异步操作，纯函数层不应包含异步代码。

✅ 修复方案：
  将包含 await 的代码移动到 flows/ 层

📚 参考文档：#architecture - 流程层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 235 行，第 9 列

**消息**: ❌ 工具层 (utils/) 禁止创建 Promise

🔍 原因：
  Promise 表示异步操作，纯函数层不应包含异步代码。
  new Promise() 会引入副作用和不确定性。

✅ 修复方案：
  1. 将 Promise 相关代码移动到 flows/ 层
  2. 使用 TaskEither 替代 Promise

📚 参考文档：#fp-patterns - TaskEither

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 235 行，第 34 列

**消息**: ❌ 工具层 (utils/) 禁止使用定时器

🔍 原因：
  定时器（setTimeout, setInterval）是副作用。
  它们会引入时序依赖和不确定性。

✅ 修复方案：
  1. 将定时器相关代码移动到 flows/ 层
  2. 考虑使用响应式编程模式

📚 参考文档：#architecture - 流程层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 241 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止调用副作用函数 console.*

🔍 原因：
  console.* 会产生副作用，破坏函数的纯净性。

🔍 常见副作用函数：
  - console.* (日志输出)
  - alert, confirm, prompt (用户交互)
  - fetch, XMLHttpRequest (网络请求)
  - localStorage, sessionStorage (存储操作)
  - DOM 操作函数

✅ 修复方案：
  1. 将这些操作移动到 flows/ 或 io/ 层
  2. 让纯函数返回需要执行的操作描述
  3. 在管道的末端处理副作用

📚 参考文档：#architecture - 纯函数层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 241 行，第 3 列

**消息**: ❌ 工具层 (utils/) 禁止访问全局对象 console

🔍 原因：
  纯函数不能依赖或修改外部状态。
  访问全局对象会破坏函数的纯净性。

🧪 纯函数原则：
  - 相同输入总是产生相同输出
  - 不能有副作用（不能修改外部状态）
  - 不能依赖外部状态

✅ 修复方案：
  1. 将副作用操作移动到 io/ 层
  2. 通过参数传递所需的数据
  3. 返回数据而不是直接执行副作用

📚 参考文档：#fp-patterns - 纯函数

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/utils/keyboard.util.ts

共 6 个问题

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 70 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 70 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 79 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 79 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 104 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

### ❌ grain/no-side-effects-in-pipes

**位置**: 第 104 行，第 4 列

**消息**: ❌ 工具层 (utils/) 禁止访问 DOM

🔍 原因：
  DOM 操作是副作用，会修改外部状态。
  纯函数不应依赖或修改 DOM。

✅ 修复方案：
  1. 将 DOM 操作移动到 views/ 层
  2. 通过参数传递所需的数据
  3. 返回数据让调用者处理 DOM

📚 参考文档：#architecture - 视图层

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/activity-bar/activity-bar.container.fn.tsx

共 4 个问题

### ❌ grain/layer-dependencies

**位置**: 第 34 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 io/
// 方案: 通过 hooks/ 和 flows/ 间接访问
// 数据流: views/ → hooks/ → flows/ → io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 35 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 41 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 42 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/activity-bar/activity-bar.view.fn.tsx

共 5 个问题

### ❌ grain/layer-dependencies

**位置**: 第 12 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 14 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 16 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/app-layout/app-layout.view.fn.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 19 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 20 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/backup-manager/backup-manager.container.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/backup-manager/backup-manager.view.fn.tsx

共 6 个问题

### ❌ grain/layer-dependencies

**位置**: 第 28 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 29 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 30 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 37 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 38 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 39 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/buffer-switcher/buffer-switcher.view.fn.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 16 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 17 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/command-palette/command-palette.container.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 12 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/command-palette/command-palette.view.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/editor-tabs/editor-tabs.view.fn.tsx

共 4 个问题

### ❌ grain/layer-dependencies

**位置**: 第 24 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 25 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 26 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 32 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/excalidraw-editor/excalidraw-editor.container.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 24 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/export-button/export-button.view.fn.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 16 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 17 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/export-dialog-manager/export-dialog-manager.container.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/export-dialog/export-dialog.container.fn.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 22 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 io/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 IO 层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 io/
// 方案: 通过 hooks/ 和 flows/ 间接访问
// 数据流: views/ → hooks/ → flows/ → io/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 23 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/export-dialog/export-dialog.types.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/export-dialog/export-dialog.view.fn.tsx

共 5 个问题

### ❌ grain/layer-dependencies

**位置**: 第 7 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 16 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 17 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 18 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/file-tree/file-tree-item.view.fn.tsx

共 3 个问题

### ❌ grain/layer-dependencies

**位置**: 第 23 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 24 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 34 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/file-tree/file-tree.types.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 6 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/file-tree/file-tree.view.fn.tsx

共 4 个问题

### ❌ grain/layer-dependencies

**位置**: 第 24 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 25 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 26 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 36 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/global-search/global-search.view.fn.tsx

共 7 个问题

### ❌ grain/layer-dependencies

**位置**: 第 9 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 10 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 11 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 12 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 18 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 19 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 20 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/keyboard-shortcuts-help/keyboard-shortcuts-help.view.fn.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 7 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/drawings-panel.tsx

共 5 个问题

### ❌ grain/layer-dependencies

**位置**: 第 11 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 12 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 14 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/file-tree-panel/file-tree-panel.container.fn.tsx

共 4 个问题

### ❌ grain/layer-dependencies

**位置**: 第 26 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 34 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依��规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 35 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 36 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/search-panel/search-panel.types.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/search-panel/search-panel.view.fn.tsx

共 8 个问题

### ❌ grain/layer-dependencies

**位置**: 第 18 行，第 1 列

**消息**: ⚠️ views/ 层不能直接导入 flows/

💡 建议：
  - 如果这是容器组件 (.container.fn.tsx)，可以导入 flows/ 和 state/
  - 如果这是视图组件 (.view.fn.tsx)，请通过 hooks/ 间接访问

✅ 正确做法：
  1. 将文件重命名为 *.container.fn.tsx（如果需要访问 flows/state）
  2. 或者创建 hook 封装逻辑

📚 参考文档：#architecture - 容器/视图分离

---

### ❌ grain/layer-dependencies

**位置**: 第 19 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 20 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 21 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 22 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 27 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 28 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 29 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/panels/tag-graph-panel/tag-graph-panel.view.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 14 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/save-status-indicator/save-status-indicator.view.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 9 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/story-right-sidebar/story-right-sidebar.view.fn.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 21 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 22 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/story-workspace/story-workspace.container.fn.tsx

共 12 个问题

### ❌ grain/layer-dependencies

**位置**: 第 22 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 pipes/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 管道层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// views/ 不能直接导入 pipes/
// 方案: 通过 hooks/ 封装
// 或者将纯函数移动到 utils/ 层

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 31 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 32 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 33 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 34 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 35 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 36 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 37 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 38 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 39 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 40 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 46 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/theme-selector/theme-selector.container.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/theme-selector/theme-selector.types.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 2 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/theme-selector/theme-selector.view.fn.tsx

共 5 个问题

### ❌ grain/layer-dependencies

**位置**: 第 13 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 14 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 16 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 17 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/theme/editor-theme.fn.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/theme/theme.fn.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 14 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/alert.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/avatar.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/badge.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/breadcrumb.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/button-group.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/button.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/card.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/checkbox.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 7 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/command.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 6 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/confirm.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 9 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 10 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/dialog.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/dropdown-menu.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/empty.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/input.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/label.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 6 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/popover.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/progress.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/radio-group.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 7 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/resize-handle.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 2 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/scroll-area.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 6 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/select.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 5 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/separator.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/sheet.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 7 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/sidebar.tsx

共 7 个问题

### ❌ grain/layer-dependencies

**位置**: 第 7 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 9 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 10 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 11 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 18 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 19 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/skeleton.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 1 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/slider.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/switch.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 6 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/table.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/tabs.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 6 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/textarea.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/toggle-group.tsx

共 2 个问题

### ❌ grain/layer-dependencies

**位置**: 第 7 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 8 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/toggle.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 7 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/ui/tooltip.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 4 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/update-checker/update-checker.types.ts

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 6 行，第 1 列

**消息**: ⚠️ views/ 层不能直接导入 flows/

💡 建议：
  - 如果这是容器组件 (.container.fn.tsx)，可以导入 flows/ 和 state/
  - 如果这是视图组件 (.view.fn.tsx)，请通过 hooks/ 间接访问

✅ 正确做法：
  1. 将文件重命名为 *.container.fn.tsx（如果需要访问 flows/state）
  2. 或者创建 hook 封装逻辑

📚 参考文档：#architecture - 容器/视图分离

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/update-checker/update-checker.view.fn.tsx

共 3 个问题

### ❌ grain/layer-dependencies

**位置**: 第 14 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 15 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

### ❌ grain/layer-dependencies

**位置**: 第 23 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 views/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 视图层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 views/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/utils/font-style-injector.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 3 行，第 1 列

**消息**: ⚠️ views/ 层不能直接导入 state/

💡 建议：
  - 如果这是容器组件 (.container.fn.tsx)，可以导入 flows/ 和 state/
  - 如果这是视图组件 (.view.fn.tsx)，请通过 hooks/ 间接访问

✅ 正确做法：
  1. 将文件重命名为 *.container.fn.tsx（如果需要访问 flows/state）
  2. 或者创建 hook 封装逻辑

📚 参考文档：#architecture - 容器/视图分离

---

## /home/lotus/project/book2/novel-editor/apps/desktop/src/views/word-count-badge/word-count-badge.view.fn.tsx

共 1 个问题

### ❌ grain/layer-dependencies

**位置**: 第 17 行，第 1 列

**消息**: ❌ 架构层级违规：views/ 层不能依赖 utils/ 层

🔍 原因：
  当前文件位于 视图层，但导入了 工具层 的模块。
  这违反了 Grain 项目的架构层级依赖规则。

🏗️ 架构原则：
  views/ 只能依赖: hooks, types

✅ 修复建议：
// 请检查架构文档，确定正确的依赖路径
// views/ 不能依赖 utils/

📚 参考文档：#architecture - 依赖规则
📋 Steering 文件：#structure - 目录结构

---
