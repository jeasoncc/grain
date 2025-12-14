# Requirements Document

## Introduction

本规范旨在优化 Novel Editor 桌面应用的数据架构，建立清晰的数据驱动开发模式。核心理念是：组件与数据分离定义，业务逻辑首先加载数据，数据绑定组件后，所有操作都针对数据而非组件。同时统一数据调度策略，明确 Zustand、Dexie、dexie-react-hooks 的职责边界，并引入 Builder 模式简化对象创建。

## Glossary

- **Dexie**: IndexedDB 的封装库，提供本地持久化存储
- **dexie-react-hooks**: Dexie 的 React hooks 封装，提供 `useLiveQuery` 实现响应式数据订阅
- **Zustand**: 轻量级状态管理库，用于管理 UI 临时状态
- **TanStack Query**: 服务端状态管理库，用于异步数据获取和缓存
- **Schema**: 数据结构定义，包含字段类型和约束
- **Interface**: TypeScript 接口，定义数据的类型契约
- **Builder Pattern**: 构建者模式，通过链式调用逐步构建复杂对象
- **Single Source of Truth**: 单一数据源原则，数据只在一处定义和管理
- **Live Query**: Dexie 的响应式查询，数据变化时自动更新订阅者

## Requirements

### Requirement 1

**User Story:** As a developer, I want a clear data layer architecture, so that I can understand where data is defined, stored, and how it flows through the application.

#### Acceptance Criteria

1. THE Data_Architecture SHALL define three distinct layers: Schema Layer (type definitions), Storage Layer (Dexie persistence), and State Layer (runtime state)
2. WHEN data is needed in a component THEN the component SHALL obtain data through hooks rather than direct database access
3. THE Data_Architecture SHALL ensure all persistent data flows through Dexie as the single source of truth
4. WHEN UI-only state is needed THEN the system SHALL use Zustand stores exclusively for non-persistent state
5. THE Data_Architecture SHALL provide clear documentation for when to use each data management tool

### Requirement 2

**User Story:** As a developer, I want unified data schemas with validation, so that data integrity is maintained across the application.

#### Acceptance Criteria

1. THE Schema_System SHALL define TypeScript interfaces for all data entities in a centralized location
2. THE Schema_System SHALL provide Zod schemas for runtime validation of all data entities
3. WHEN creating or updating data THEN the system SHALL validate against the corresponding Zod schema
4. THE Schema_System SHALL include a Builder class for each complex data entity
5. WHEN a Builder creates an object THEN the Builder SHALL validate the result before returning

### Requirement 3

**User Story:** As a developer, I want to use the Builder pattern for object creation, so that I can create objects with minimal boilerplate and clear intent.

#### Acceptance Criteria

1. THE Builder_Pattern SHALL provide a fluent API with chainable methods for setting properties
2. WHEN a Builder is used THEN the Builder SHALL provide sensible defaults for optional properties
3. THE Builder_Pattern SHALL support partial builds for update operations
4. WHEN build() is called THEN the Builder SHALL return a validated, complete object
5. THE Builder_Pattern SHALL integrate with Zod schemas for validation

### Requirement 4

**User Story:** As a developer, I want to understand when to use each data management tool, so that I can make optimal choices for performance and maintainability.

#### Acceptance Criteria

1. THE Data_Strategy SHALL specify that Dexie is used for all persistent data (projects, nodes, wiki entries, drawings)
2. THE Data_Strategy SHALL specify that dexie-react-hooks (useLiveQuery) is used for reactive data subscriptions in components
3. THE Data_Strategy SHALL specify that Zustand is used only for UI state (sidebar open/closed, active panel, selection state)
4. THE Data_Strategy SHALL specify that TanStack Query is NOT needed when using dexie-react-hooks for local data
5. WHEN data needs to be shared across components THEN the system SHALL use dexie-react-hooks for persistent data or Zustand for UI state

### Requirement 5

**User Story:** As a user editing 5000+ character documents, I want the editor to remain performant, so that my writing experience is smooth.

#### Acceptance Criteria

1. THE Performance_Strategy SHALL ensure Lexical editor content is stored as serialized JSON in Dexie
2. WHEN loading a document THEN the system SHALL load only the active document's content into memory
3. THE Performance_Strategy SHALL implement debounced saves to prevent excessive database writes
4. WHEN switching between documents THEN the system SHALL preserve editor state in memory for recently accessed documents
5. THE Performance_Strategy SHALL use Dexie's indexed queries for efficient data retrieval

### Requirement 6

**User Story:** As a developer, I want to refactor existing code to follow the new architecture, so that the codebase is consistent and maintainable.

#### Acceptance Criteria

1. WHEN refactoring stores THEN the system SHALL migrate persistent state from Zustand to Dexie
2. WHEN refactoring services THEN the system SHALL ensure services only contain business logic, not state
3. THE Refactoring_Plan SHALL preserve backward compatibility with existing data
4. WHEN refactoring hooks THEN the system SHALL consolidate data access patterns using useLiveQuery
5. THE Refactoring_Plan SHALL include migration steps for each affected module

