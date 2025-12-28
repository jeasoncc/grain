/**
 * @file fn/node/node.tree.fn.test.ts
 * @description 节点树操作纯函数测试
 *
 * 包含单元测试和属性测试（Property-Based Testing）
 * 使用 fast-check 进行属性测试
 *
 * @requirements 2.1, 1.4
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { NodeInterface, NodeType } from "@/types/node";
import {
	buildTree,
	calculateReorderAfterInsert,
	filterByTag,
	filterByType,
	getChildNodes,
	getDescendants,
	getNextOrder,
	getNodePath,
	getRootNodes,
	type TreeNode,
	wouldCreateCycle,
} from "./node.tree.fn";

// ============================================================================
// Test Helpers - Node Generators
// ============================================================================

/**
 * 生成有效的 ISO 日期字符串
 */
const isoDateArbitrary = (): fc.Arbitrary<string> =>
	fc
		.integer({ min: 946684800000, max: 4102444800000 }) // 2000-01-01 to 2100-01-01
		.map((timestamp) => new Date(timestamp).toISOString());

/**
 * 生成有效的 NodeInterface 对象
 */
const nodeArbitrary = (
	overrides?: Partial<NodeInterface>,
): fc.Arbitrary<NodeInterface> =>
	fc
		.record({
			id: fc.uuid(),
			workspace: fc.uuid(),
			parent: fc.option(fc.uuid(), { nil: null }),
			type: fc.constantFrom<NodeType>("folder", "file", "drawing", "diary"),
			title: fc.string({ minLength: 1, maxLength: 200 }),
			order: fc.nat({ max: 1000 }),
			collapsed: fc.boolean(),
			createDate: isoDateArbitrary(),
			lastEdit: isoDateArbitrary(),
			tags: fc.option(
				fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
				{ nil: undefined },
			),
		})
		.map((node) => ({ ...node, ...overrides })) as fc.Arbitrary<NodeInterface>;

// ============================================================================
// Unit Tests
// ============================================================================

describe("buildTree", () => {
	it("should build tree from flat nodes", () => {
		const nodes: NodeInterface[] = [
			createNode({
				id: "1",
				parent: null,
				order: 0,
				title: "Root",
				type: "folder",
			}),
			createNode({
				id: "2",
				parent: "1",
				order: 0,
				title: "Child",
				type: "file",
			}),
		];
		const tree = buildTree(nodes);
		expect(tree).toHaveLength(1);
		expect(tree[0].children).toHaveLength(1);
	});

	it("should sort by order", () => {
		const nodes: NodeInterface[] = [
			createNode({
				id: "1",
				parent: null,
				order: 1,
				title: "Second",
				type: "file",
			}),
			createNode({
				id: "2",
				parent: null,
				order: 0,
				title: "First",
				type: "file",
			}),
		];
		const tree = buildTree(nodes);
		expect(tree[0].title).toBe("First");
		expect(tree[1].title).toBe("Second");
	});

	it("should handle empty nodes array", () => {
		const tree = buildTree([]);
		expect(tree).toHaveLength(0);
	});

	it("should set correct depth", () => {
		const nodes: NodeInterface[] = [
			createNode({
				id: "1",
				parent: null,
				order: 0,
				title: "Root",
				type: "folder",
			}),
			createNode({
				id: "2",
				parent: "1",
				order: 0,
				title: "Level 1",
				type: "folder",
			}),
			createNode({
				id: "3",
				parent: "2",
				order: 0,
				title: "Level 2",
				type: "file",
			}),
		];
		const tree = buildTree(nodes);
		expect(tree[0].depth).toBe(0);
		expect(tree[0].children[0].depth).toBe(1);
		expect(tree[0].children[0].children[0].depth).toBe(2);
	});
});

describe("getNodePath", () => {
	it("should return path from root to node", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null, title: "Root" }),
			createNode({ id: "2", parent: "1", title: "Child" }),
			createNode({ id: "3", parent: "2", title: "Grandchild" }),
		];
		const path = getNodePath(nodes, "3");
		expect(path).toHaveLength(3);
		expect(path[0].id).toBe("1");
		expect(path[1].id).toBe("2");
		expect(path[2].id).toBe("3");
	});

	it("should return single node for root", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null, title: "Root" }),
		];
		const path = getNodePath(nodes, "1");
		expect(path).toHaveLength(1);
		expect(path[0].id).toBe("1");
	});

	it("should return empty array for non-existent node", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null, title: "Root" }),
		];
		const path = getNodePath(nodes, "non-existent");
		expect(path).toHaveLength(0);
	});
});

describe("wouldCreateCycle", () => {
	it("should return false for null parent", () => {
		const nodes: NodeInterface[] = [createNode({ id: "1", parent: null })];
		expect(wouldCreateCycle(nodes, "1", null)).toBe(false);
	});

	it("should return true when node is its own parent", () => {
		const nodes: NodeInterface[] = [createNode({ id: "1", parent: null })];
		expect(wouldCreateCycle(nodes, "1", "1")).toBe(true);
	});

	it("should return true when moving to descendant", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null }),
			createNode({ id: "2", parent: "1" }),
			createNode({ id: "3", parent: "2" }),
		];
		expect(wouldCreateCycle(nodes, "1", "3")).toBe(true);
	});

	it("should return false for valid move", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null }),
			createNode({ id: "2", parent: null }),
			createNode({ id: "3", parent: "1" }),
		];
		expect(wouldCreateCycle(nodes, "3", "2")).toBe(false);
	});
});

describe("getRootNodes", () => {
	it("should return only root nodes", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null, order: 0 }),
			createNode({ id: "2", parent: "1", order: 0 }),
			createNode({ id: "3", parent: null, order: 1 }),
		];
		const roots = getRootNodes(nodes);
		expect(roots).toHaveLength(2);
		expect(roots.every((n) => n.parent === null)).toBe(true);
	});

	it("should sort by order", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null, order: 2 }),
			createNode({ id: "2", parent: null, order: 0 }),
			createNode({ id: "3", parent: null, order: 1 }),
		];
		const roots = getRootNodes(nodes);
		expect(roots[0].id).toBe("2");
		expect(roots[1].id).toBe("3");
		expect(roots[2].id).toBe("1");
	});
});

describe("getChildNodes", () => {
	it("should return children of parent", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null }),
			createNode({ id: "2", parent: "1", order: 0 }),
			createNode({ id: "3", parent: "1", order: 1 }),
			createNode({ id: "4", parent: "2" }),
		];
		const children = getChildNodes(nodes, "1");
		expect(children).toHaveLength(2);
		expect(children.every((n) => n.parent === "1")).toBe(true);
	});
});

describe("getDescendants", () => {
	it("should return all descendants", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null }),
			createNode({ id: "2", parent: "1" }),
			createNode({ id: "3", parent: "1" }),
			createNode({ id: "4", parent: "2" }),
		];
		const descendants = getDescendants(nodes, "1");
		expect(descendants).toHaveLength(3);
	});

	it("should return empty array for leaf node", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", parent: null }),
			createNode({ id: "2", parent: "1" }),
		];
		const descendants = getDescendants(nodes, "2");
		expect(descendants).toHaveLength(0);
	});
});

describe("filterByType", () => {
	it("should filter nodes by type", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", type: "folder" }),
			createNode({ id: "2", type: "file" }),
			createNode({ id: "3", type: "folder" }),
		];
		const folders = filterByType(nodes, "folder");
		expect(folders).toHaveLength(2);
		expect(folders.every((n) => n.type === "folder")).toBe(true);
	});
});

describe("filterByTag", () => {
	it("should filter nodes by tag", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", tags: ["important", "work"] }),
			createNode({ id: "2", tags: ["personal"] }),
			createNode({ id: "3", tags: ["important"] }),
		];
		const important = filterByTag(nodes, "important");
		expect(important).toHaveLength(2);
	});

	it("should handle nodes without tags", () => {
		const nodes: NodeInterface[] = [
			createNode({ id: "1", tags: ["test"] }),
			createNode({ id: "2" }), // no tags
		];
		const filtered = filterByTag(nodes, "test");
		expect(filtered).toHaveLength(1);
	});
});

describe("getNextOrder", () => {
	it("should return 0 for empty siblings", () => {
		expect(getNextOrder([])).toBe(0);
	});

	it("should return max order + 1", () => {
		const siblings: NodeInterface[] = [
			createNode({ id: "1", order: 0 }),
			createNode({ id: "2", order: 2 }),
			createNode({ id: "3", order: 1 }),
		];
		expect(getNextOrder(siblings)).toBe(3);
	});
});

describe("calculateReorderAfterInsert", () => {
	it("should calculate new orders after insert", () => {
		const siblings: NodeInterface[] = [
			createNode({ id: "1", order: 0 }),
			createNode({ id: "2", order: 1 }),
			createNode({ id: "3", order: 2 }),
		];
		const reorder = calculateReorderAfterInsert(siblings, 1);
		// 插入位置 1，所以 order >= 1 的节点需要 +1
		expect(reorder.get("2")).toBe(2);
		expect(reorder.get("3")).toBe(3);
		expect(reorder.has("1")).toBe(false); // order 0 不变
	});
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe("Property-Based Tests", () => {
	/**
	 * **Feature: fp-architecture-refactor, Property 1: 节点不能成为自己的父节点**
	 * **Validates: Requirements 2.1**
	 */
	describe("wouldCreateCycle - property based", () => {
		it("should never allow node to be its own parent", () => {
			fc.assert(
				fc.property(fc.uuid(), (nodeId) => {
					const nodes: NodeInterface[] = [
						createNode({ id: nodeId, parent: null }),
					];
					return wouldCreateCycle(nodes, nodeId, nodeId) === true;
				}),
				{ numRuns: 100 },
			);
		});

		it("should always allow moving to null parent", () => {
			fc.assert(
				fc.property(fc.uuid(), (nodeId) => {
					const nodes: NodeInterface[] = [
						createNode({ id: nodeId, parent: "other" }),
					];
					return wouldCreateCycle(nodes, nodeId, null) === false;
				}),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 2: buildTree 保持节点数量不变**
	 * **Validates: Requirements 2.1**
	 */
	describe("buildTree - property based", () => {
		it("should preserve total node count in tree", () => {
			fc.assert(
				fc.property(
					fc.array(nodeArbitrary({ parent: null }), {
						minLength: 0,
						maxLength: 10,
					}),
					(nodes) => {
						const tree = buildTree(nodes);
						const countTreeNodes = (treeNodes: TreeNode[]): number =>
							treeNodes.reduce(
								(sum, n) => sum + 1 + countTreeNodes(n.children),
								0,
							);
						// 所有根节点（parent === null）应该在树中
						const rootCount = nodes.filter((n) => n.parent === null).length;
						return countTreeNodes(tree) === rootCount;
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should sort children by order", () => {
			fc.assert(
				fc.property(
					fc.array(nodeArbitrary({ parent: null }), {
						minLength: 2,
						maxLength: 10,
					}),
					(nodes) => {
						const tree = buildTree(nodes);
						const isSorted = (treeNodes: TreeNode[]): boolean => {
							for (let i = 1; i < treeNodes.length; i++) {
								const prevNode = nodes.find(
									(n) => n.id === treeNodes[i - 1].id,
								);
								const currNode = nodes.find((n) => n.id === treeNodes[i].id);
								if (prevNode && currNode && prevNode.order > currNode.order) {
									return false;
								}
							}
							return treeNodes.every((n) => isSorted(n.children));
						};
						return isSorted(tree);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 3: getNodePath 返回有效路径**
	 * **Validates: Requirements 2.1**
	 */
	describe("getNodePath - property based", () => {
		it("should return path ending with target node", () => {
			fc.assert(
				fc.property(
					fc.array(nodeArbitrary({ parent: null }), {
						minLength: 1,
						maxLength: 10,
					}),
					(nodes) => {
						const targetNode = nodes[0];
						const path = getNodePath(nodes, targetNode.id);
						return (
							path.length === 0 || path[path.length - 1].id === targetNode.id
						);
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return empty array for non-existent node", () => {
			fc.assert(
				fc.property(
					fc.array(nodeArbitrary({ parent: null }), {
						minLength: 0,
						maxLength: 10,
					}),
					fc.uuid(),
					(nodes, randomId) => {
						// 确保 randomId 不在 nodes 中
						if (nodes.some((n) => n.id === randomId)) return true;
						const path = getNodePath(nodes, randomId);
						return path.length === 0;
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 4: getNextOrder 总是返回大于现有最大值的数**
	 * **Validates: Requirements 2.1**
	 */
	describe("getNextOrder - property based", () => {
		it("should return value greater than all existing orders", () => {
			fc.assert(
				fc.property(
					fc.array(nodeArbitrary(), { minLength: 1, maxLength: 20 }),
					(nodes) => {
						const nextOrder = getNextOrder(nodes);
						return nodes.every((n) => nextOrder > n.order);
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return 0 for empty array", () => {
			expect(getNextOrder([])).toBe(0);
		});
	});

	/**
	 * **Feature: fp-architecture-refactor, Property 5: filterByType 只返回指定类型的节点**
	 * **Validates: Requirements 2.1**
	 */
	describe("filterByType - property based", () => {
		it("should only return nodes of specified type", () => {
			fc.assert(
				fc.property(
					fc.array(nodeArbitrary(), { minLength: 0, maxLength: 20 }),
					fc.constantFrom<NodeType>("folder", "file", "drawing", "diary"),
					(nodes, type) => {
						const filtered = filterByType(nodes, type);
						return filtered.every((n) => n.type === type);
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should not lose any nodes of specified type", () => {
			fc.assert(
				fc.property(
					fc.array(nodeArbitrary(), { minLength: 0, maxLength: 20 }),
					fc.constantFrom<NodeType>("folder", "file", "drawing", "diary"),
					(nodes, type) => {
						const filtered = filterByType(nodes, type);
						const expected = nodes.filter((n) => n.type === type);
						return filtered.length === expected.length;
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 创建测试用的 NodeInterface 对象
 */
function createNode(overrides: Partial<NodeInterface> = {}): NodeInterface {
	return {
		id: overrides.id ?? "test-id",
		workspace: overrides.workspace ?? "test-workspace",
		parent: overrides.parent ?? null,
		type: overrides.type ?? "file",
		title: overrides.title ?? "Test Node",
		order: overrides.order ?? 0,
		collapsed: overrides.collapsed ?? true,
		createDate: overrides.createDate ?? new Date().toISOString(),
		lastEdit: overrides.lastEdit ?? new Date().toISOString(),
		tags: overrides.tags,
	};
}
