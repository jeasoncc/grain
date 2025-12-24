---
inclusion: manual
---

# 设计模式指南

记录项目中重要的设计模式和抽象原则，避免重复实现相似功能。

## 业务逻辑抽象审查

### 核心原则

**相似的业务逻辑必须抽象为高阶函数**，而不是复制粘贴。

### 案例：模板化文件创建

#### 问题识别

Diary 和 Wiki 创建逻辑几乎相同：

```typescript
// ❌ 重复模式 - diary
export const createDiary = (params) => {
  const content = generateDiaryContent(params.date);     // 1. 生成模板
  const parsed = JSON.parse(content);                    // 2. 解析 JSON
  const result = await createFileInTree({                // 3. 创建文件
    workspaceId: params.workspaceId,
    title: structure.filename,
    folderPath: [DIARY_ROOT, yearFolder, monthFolder, dayFolder],
    type: "diary",
    tags: ["diary"],
    content,
  });
  return { node: result.node, content, parsedContent };  // 4. 返回结果
};

// ❌ 重复模式 - wiki（结构完全相同！）
export const createWiki = (params) => {
  const content = generateWikiTemplate(params.name);     // 1. 生成模板
  const parsed = JSON.parse(content);                    // 2. 解析 JSON
  const result = await createFileInTree({                // 3. 创建文件
    workspaceId: params.workspaceId,
    title: params.name,
    folderPath: [WIKI_ROOT],
    type: "file",
    tags: ["wiki"],
    content,
  });
  return { node: result.node, content, parsedContent };  // 4. 返回结果
};
```

#### 正确抽象

```typescript
// ✅ 高阶函数抽象
interface TemplateConfig<T> {
  readonly rootFolder: string;
  readonly fileType: NodeType;
  readonly tag: string;
  readonly generateTemplate: (params: T) => string;
  readonly generateFolderPath: (params: T) => string[];
  readonly generateTitle: (params: T) => string;
}

const createTemplatedFile = <T>(config: TemplateConfig<T>) => 
  (params: T & { workspaceId: string }): TE.TaskEither<AppError, CreationResult> =>
    pipe(
      TE.Do,
      TE.bind("content", () => TE.of(config.generateTemplate(params))),
      TE.bind("parsed", ({ content }) => parseJsonSafe(content)),
      TE.chain(({ content, parsed }) => 
        pipe(
          createFileInTree({
            workspaceId: params.workspaceId,
            title: config.generateTitle(params),
            folderPath: config.generateFolderPath(params),
            type: config.fileType,
            tags: [config.tag],
            content,
          }),
          TE.map(result => ({ node: result.node, content, parsedContent: parsed }))
        )
      )
    );
```

#### 配置实例化

```typescript
// Diary 配置
const diaryConfig: TemplateConfig<CreateDiaryParams> = {
  rootFolder: "Diary",
  fileType: "diary",
  tag: "diary",
  generateTemplate: (params) => generateDiaryContent(params.date || new Date()),
  generateFolderPath: (params) => {
    const s = getDiaryFolderStructure(params.date || new Date());
    return ["Diary", s.yearFolder, s.monthFolder, s.dayFolder];
  },
  generateTitle: (params) => getDiaryFolderStructure(params.date || new Date()).filename,
};

// Wiki 配置
const wikiConfig: TemplateConfig<WikiCreationParams> = {
  rootFolder: "Wiki",
  fileType: "file",
  tag: "wiki",
  generateTemplate: (params) => generateWikiTemplate(params.name),
  generateFolderPath: () => ["Wiki"],
  generateTitle: (params) => params.name,
};

// 实例化
export const createDiary = createTemplatedFile(diaryConfig);
export const createWiki = createTemplatedFile(wikiConfig);
```

### 其他可抽象的模式

#### 1. 标准 CRUD Actions

```typescript
// ❌ 重复：createNode, createDrawing, createWorkspace
// ✅ 抽象：
const createEntity = <T, R>(config: EntityConfig<T, R>) => 
  (params: T): TE.TaskEither<AppError, R> => /* ... */;
```

#### 2. 导出功能

```typescript
// ❌ 重复：exportToMarkdown, exportToJSON, exportToOrgmode
// ✅ 抽象：
const exportWithFormat = <T>(config: ExportConfig<T>) => 
  (content: Content): TE.TaskEither<AppError, string> => /* ... */;
```

#### 3. 搜索过滤

```typescript
// ❌ 重复：searchNodes, searchWorkspaces, searchDrawings
// ✅ 抽象：
const searchEntities = <T>(config: SearchConfig<T>) => 
  (query: string): TE.TaskEither<AppError, T[]> => /* ... */;
```

## 抽象原则

### 何时抽象

| 条件 | 行动 |
|------|------|
| 相同模式出现 3 次 | 必须抽象 |
| 结构相似度 > 80% | 考虑抽象 |
| 预期会有更多实例 | 提前抽象 |

### 何时不抽象

| 条件 | 原因 |
|------|------|
| 只有 2 个实例且不会扩展 | 过度工程 |
| 业务逻辑差异大 | 强制抽象增加复杂度 |
| 为了抽象而抽象 | 代码可读性下降 |

### 抽象层级

```
具体实现 → 模板函数 → 高阶函数 → 通用框架
```

选择合适的层级，避免过度抽象。

## 重构指导

### 识别重复模式的信号

1. **复制粘贴代码**：发现自己在复制代码时
2. **相似的文件结构**：多个 action 文件结构几乎一样
3. **相同的错误处理**：错误处理逻辑完全相同
4. **相似的测试用例**：测试结构和断言几乎一样

### 重构步骤

1. **提取共同接口**：定义配置接口
2. **创建高阶函数**：实现通用逻辑
3. **配置实例化**：为每个具体场景创建配置
4. **渐进式迁移**：逐步替换现有实现
5. **测试验证**：确保功能不变

## 文件组织建议

```
src/actions/
├── templated/                    # 模板化文件创建
│   ├── create-templated-file.action.ts  # 高阶函数
│   ├── configs/
│   │   ├── diary.config.ts       # Diary 配置
│   │   ├── wiki.config.ts        # Wiki 配置
│   │   └── index.ts
│   ├── create-diary.action.ts    # 实例化导出
│   ├── create-wiki.action.ts     # 实例化导出
│   └── index.ts
```

---

**使用场景**：当发现代码重复或相似模式时，参考此文件进行抽象设计。
