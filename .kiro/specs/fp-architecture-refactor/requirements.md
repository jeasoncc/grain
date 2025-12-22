# Requirements Document

## Introduction

本规范定义了 Grain Desktop 应用从当前架构迁移到函数式编程架构的需求。重构目标是建立清晰的数据流：`types/ → fn/ → db/ → stores/ → hooks/ → components/`，实现数据像水流一样流经管道的设计理念。

## Glossary

- **Node**: 文件树中的节点（文件、文件夹、日记）
- **Workspace**: 工作区，包含多个节点
- **Content**: 节点的编辑器内容（Lexical JSON）
- **Builder**: 构建不可变对象的类，提供链式 API
- **Pure Function**: 无副作用的函数，相同输入产生相同输出
- **Pipe**: 函数组合工具，将多个函数串联成管道
- **Either**: fp-ts 中的错误处理类型，表示成功或失败

## Requirements

### Requirement 1: 安装函数式编程依赖

**User Story:** As a developer, I want to have fp-ts, es-toolkit, and immer installed, so that I can use functional programming patterns throughout the codebase.

#### Acceptance Criteria

1. WHEN the project is set up THEN the System SHALL have fp-ts installed as a dependency
2. WHEN the project is set up THEN the System SHALL have es-toolkit installed as a dependency
3. WHEN the project is set up THEN the System SHALL have immer installed as a dependency
4. WHEN the project is set up THEN the System SHALL have @tanstack/react-virtual installed as a dependency
5. WHEN the project is set up THEN the System SHALL have million installed as a dependency

### Requirement 2: 创建类型定义层 (types/)

**User Story:** As a developer, I want all data types defined with Interface + Builder + Zod Schema pattern, so that data structures are immutable and validated.

#### Acceptance Criteria

1. WHEN defining a data type THEN the System SHALL create an interface file (`xxx.interface.ts`) with readonly properties
2. WHEN defining a data type THEN the System SHALL create a Zod schema file (`xxx.schema.ts`) for runtime validation
3. WHEN defining a data type THEN the System SHALL create a Builder class file (`xxx.builder.ts`) with `from()` and `build()` methods
4. WHEN building an object THEN the Builder SHALL return an immutable object using `Object.freeze()`
5. WHEN validating external data THEN the System SHALL use Zod schema before constructing objects

### Requirement 3: 重构数据库层 (db/)

**User Story:** As a developer, I want database operations organized as pure functions, so that data persistence is predictable and testable.

#### Acceptance Criteria

1. WHEN performing database operations THEN the System SHALL use functions in `*.db.fn.ts` files
2. WHEN a database operation fails THEN the System SHALL return an Either type with error information
3. WHEN a database operation succeeds THEN the System SHALL return an Either type with the result
4. WHEN performing database operations THEN the System SHALL log using the logger module with `[DB]` prefix
5. WHEN defining database functions THEN each function SHALL have a corresponding test file

### Requirement 4: 重构状态管理层 (stores/)

**User Story:** As a developer, I want state management organized as pure functions with Zustand, so that state changes are immutable and traceable.

#### Acceptance Criteria

1. WHEN managing state THEN the System SHALL use Zustand with Immer middleware
2. WHEN updating state THEN the System SHALL use immutable patterns
3. WHEN defining store functions THEN the System SHALL place them in `*.store.fn.ts` files
4. WHEN state changes THEN the System SHALL log using the logger module with `[Store]` prefix

### Requirement 5: 创建纯函数层 (fn/)

**User Story:** As a developer, I want business logic organized as pure functions, so that data transformations are composable and testable.

#### Acceptance Criteria

1. WHEN processing data THEN the System SHALL use pure functions in `*.fn.ts` files
2. WHEN composing functions THEN the System SHALL use fp-ts pipe for function composition
3. WHEN a function can fail THEN the System SHALL return an Either type
4. WHEN defining pure functions THEN each function SHALL have a corresponding test file with property-based tests

### Requirement 6: 重构组件层 (components/)

**User Story:** As a developer, I want React components to be pure presentation components, so that they only receive data through props.

#### Acceptance Criteria

1. WHEN rendering data THEN the Component SHALL receive all data through props
2. WHEN a component needs business data THEN the Component SHALL NOT directly access Store or DB
3. WHEN a component has internal state THEN the state SHALL only be for UI purposes (isOpen, isHovered)
4. WHEN rendering large lists (>100 items) THEN the Component SHALL use @tanstack/react-virtual

### Requirement 7: 重构路由层 (routes/)

**User Story:** As a developer, I want route components to be orchestration layers, so that they connect data to presentation components.

#### Acceptance Criteria

1. WHEN a route needs to perform actions THEN the Route SHALL call functions from `actions/` directory
2. WHEN a route needs data THEN the Route SHALL use hooks to obtain data
3. WHEN passing data to children THEN the Route SHALL pass data through props
4. WHEN defining action functions THEN each action SHALL be in a separate file (`xxx-yyy.action.ts`)
5. WHEN action functions are small (<10 lines) and related THEN they MAY be combined in one file

### Requirement 8: 迁移 domain/ 到新架构

**User Story:** As a developer, I want domain logic migrated to the new architecture, so that the codebase follows consistent patterns.

#### Acceptance Criteria

1. WHEN migrating domain logic THEN the System SHALL move type definitions to `types/`
2. WHEN migrating domain logic THEN the System SHALL move pure functions to `fn/`
3. WHEN migrating domain logic THEN the System SHALL move store logic to `stores/`
4. WHEN migrating domain logic THEN the System SHALL move database operations to `db/`
5. WHEN migration is complete THEN the `domain/` directory SHALL be removed

### Requirement 9: 迁移 services/ 到新架构

**User Story:** As a developer, I want services migrated to the new architecture, so that the codebase follows consistent patterns.

#### Acceptance Criteria

1. WHEN migrating services THEN the System SHALL move database operations to `db/`
2. WHEN migrating services THEN the System SHALL move utility functions to `fn/`
3. WHEN migration is complete THEN the `services/` directory SHALL be removed

### Requirement 10: 删除未使用的依赖

**User Story:** As a developer, I want unused dependencies removed, so that the bundle size is minimized.

#### Acceptance Criteria

1. WHEN cleaning dependencies THEN the System SHALL remove lodash from dependencies
2. WHEN cleaning dependencies THEN the System SHALL remove @types/lodash from devDependencies
3. WHEN cleaning dependencies THEN the System SHALL remove react-complex-tree from dependencies
4. WHEN cleaning dependencies THEN the System SHALL remove @radix-ui/react-icons from dependencies
5. WHEN cleaning dependencies THEN the System SHALL remove @hookform/resolvers from dependencies
6. WHEN cleaning dependencies THEN the System SHALL remove @tanstack/react-query from dependencies
7. WHEN cleaning dependencies THEN the System SHALL remove @tanstack/react-devtools from dependencies
