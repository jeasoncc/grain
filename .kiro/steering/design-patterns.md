---
inclusion: manual
---

# 设计模式指南

记录项目中重要的设计模式和抽象原则，避免重复实现相似功能。

## 模板化文件创建模式

### 问题识别

当发现多个 action 有相似的结构时，应该考虑抽象为高阶函数：

```typescript
// ❌ 重复的模式 - wiki 和 diary 都是这个结构
export const createXxxFile = (params) => {
  // 1. 生成模板内容
  const content = generateXxxTemplate(params);
  
  // 2. 调用 createFileInTree
  const result = await createFileInTree({
    workspaceId: params.workspaceId,
    title: params.title,
    folderPath: [XXX_ROOT_FOLDER, ...],
    type: "xxx",
    tags: ["xxx"],
    content,
  });
  
  // 3. 相同的错误处理和日志
  return result;
};
```

### 抽象方案

创建高阶函数 `createTemplatedFile`：

```typescript
// ✅ 抽象后的高阶函数
interface TemplateConfig<T> {
  readonly rootFolder: string;
  readonly fileType: NodeType;
  readonly tag: string;
  readonly generateTemplate: (params: T) => string;
  readonly generateFolderPath: (params: T) => string[];
  readonly generateTitle: (params: T) => string;
}

const createTemplatedFile = <T>(config: TemplateConfig<T>) => 
  (params: T & { workspaceId: string }): TE.TaskEither<AppError, CreationResult> => {
    logger.start(`[Action] 创建${config.fileType}文件...`);
    
    return TE.tryCatch(
      async () => {
        const content = config.generateTemplate(params);
        const parsedContent = JSON.parse(content);
        
        const result = await createFileInTree({
          workspaceId: params.workspaceId,
          title: config.generateTitle(params),
          folderPath: config.generateFolderPath(params),
          type: config.fileType,
          tags: [config.tag],
          content,
        });
        
        logger.success(`[Action] ${config.fileType}文件创建成功:`, result.node.id);
        
        return {
          node: result.node,
          content,
          parsedContent,
        };
      },
      (error): AppError => ({
        type: "DB_ERROR",
        message: `创建${config.fileType}文件失败: ${error instanceof Error ? error.message : String(error)}`,
      })
    );
  };
```

### 具体实例化

```typescript
// Wiki 配置
const wikiConfig: TemplateConfig<WikiCreationParams> = {
  rootFolder: "Wiki",
  fileType: "file",
  tag: "wiki",
  generateTemplate: (params) => generateWikiTemplate(params.name),
  generateFolderPath: () => ["Wiki"],
  generateTitle: (params) => params.name,
};

// Diary 配置
const diaryConfig: TemplateConfig<CreateDiaryParams> = {
  rootFolder: "Diary",
  fileType: "diary", 
  tag: "diary",
  generateTemplate: (params) => generateDiaryContent(params.date || new Date()),
  generateFolderPath: (params) => {
    const structure = getDiaryFolderStructure(params.date || new Date());
    return ["Diary", structure.yearFolder, structure.monthFolder, structure.dayFolder];
  },
  generateTitle: (params) => {
    const structure = getDiaryFolderStructure(params.date || new Date());
    return structure.filename;
  },
};

// 实例化具体函数
export const createWikiFile = createTemplatedFile(wikiConfig);
export const createDiary = createTemplatedFile(diaryConfig);
```

## 其他可抽象的模式

### 1. 标准 CRUD Actions

发现多个实体有相似的 CRUD 操作时，考虑抽象：

```typescript
// ❌ 重复：createNode, createDrawing, createWorkspace
// ✅ 抽象：createEntity<T>(entityConfig)
```

### 2. 导出功能模式

多种导出格式有相似结构时：

```typescript
// ❌ 重复：exportToMarkdown, exportToJSON, exportToOrgmode  
// ✅ 抽象：exportWithFormat<T>(formatConfig)
```

### 3. 搜索过滤模式

不同类型的搜索有相似逻辑时：

```typescript
// ❌ 重复：searchNodes, searchWorkspaces, searchDrawings
// ✅ 抽象：searchEntities<T>(searchConfig)
```

## 抽象原则

### 何时抽象

- **3 次规则**：相同模式出现 3 次时考虑抽象
- **结构相似度 > 80%**：大部分逻辑相同，只有参数不同
- **未来扩展性**：预期会有更多相似的实现

### 何时不抽象

- **过度工程**：只有 2 个实例且不太可能扩展
- **强制抽象**：为了抽象而抽象，导致代码复杂度增加
- **业务差异大**：看似相似但业务逻辑差异很大

### 抽象层级

```
具体实现 → 模板函数 → 高阶函数 → 通用框架
```

选择合适的抽象层级，避免过度抽象。

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

---

**使用场景**：当发现代码重复或相似模式时，参考此文件进行抽象设计。
