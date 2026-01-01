/**
 * Query Key 工厂
 *
 * 定义 TanStack Query 的 query keys，确保类型安全和一致性。
 * 所有 query keys 都从这里导出，避免硬编码字符串。
 *
 * 命名规范：
 * - all: 获取所有数据
 * - detail: 获取单个数据
 * - byXxx: 按条件筛选
 */

export const queryKeys = {
  // ============================================
  // Workspace Keys
  // ============================================
  workspaces: {
    /** 所有工作区 */
    all: ["workspaces"] as const,
    /** 单个工作区 */
    detail: (id: string) => ["workspaces", id] as const,
  },

  // ============================================
  // Node Keys
  // ============================================
  nodes: {
    /** 所有节点（全局） */
    all: ["nodes"] as const,
    /** 工作区下的所有节点 */
    byWorkspace: (workspaceId: string) =>
      ["nodes", "workspace", workspaceId] as const,
    /** 根节点 */
    rootNodes: (workspaceId: string) =>
      ["nodes", "root", workspaceId] as const,
    /** 单个节点 */
    detail: (id: string) => ["nodes", id] as const,
    /** 子节点 */
    children: (parentId: string) => ["nodes", "children", parentId] as const,
    /** 按父节点（支持 null 表示根） */
    byParent: (workspaceId: string, parentId: string | null) =>
      ["nodes", "parent", workspaceId, parentId ?? "root"] as const,
    /** 后代节点 */
    descendants: (nodeId: string) => ["nodes", "descendants", nodeId] as const,
    /** 按类型 */
    byType: (workspaceId: string, type: string) =>
      ["nodes", "type", workspaceId, type] as const,
  },

  // ============================================
  // Content Keys
  // ============================================
  contents: {
    /** 节点内容 */
    byNode: (nodeId: string) => ["contents", "node", nodeId] as const,
    /** 内容版本 */
    version: (nodeId: string) => ["contents", "version", nodeId] as const,
  },
} as const;

// ============================================
// 类型导出
// ============================================

/** Workspace query key 类型 */
export type WorkspaceQueryKey =
  | typeof queryKeys.workspaces.all
  | ReturnType<typeof queryKeys.workspaces.detail>;

/** Node query key 类型 */
export type NodeQueryKey =
  | typeof queryKeys.nodes.all
  | ReturnType<typeof queryKeys.nodes.byWorkspace>
  | ReturnType<typeof queryKeys.nodes.rootNodes>
  | ReturnType<typeof queryKeys.nodes.detail>
  | ReturnType<typeof queryKeys.nodes.children>
  | ReturnType<typeof queryKeys.nodes.byParent>
  | ReturnType<typeof queryKeys.nodes.descendants>
  | ReturnType<typeof queryKeys.nodes.byType>;

/** Content query key 类型 */
export type ContentQueryKey =
  | ReturnType<typeof queryKeys.contents.byNode>
  | ReturnType<typeof queryKeys.contents.version>;
