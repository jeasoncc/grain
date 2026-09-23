import { describe, expect, it } from "vitest"
import { buildOrgWorkspaceTree } from "./org-workspace-tree.pipe"

describe("buildOrgWorkspaceTree", () => {
	it("builds nested directories, keeps empty directories, and sorts folders before files", () => {
		const tree = buildOrgWorkspaceTree(
			["z-empty", "projects", "projects/book"],
			[
				{ relativePath: "root.org", revision: "r1" },
				{ relativePath: "projects/book/chapter.org", revision: "r2" },
				{ relativePath: "projects/index.org", revision: "r3" },
			],
		)

		expect(tree).toEqual([
			{
				children: [
					{
						children: [
							{
								name: "chapter.org",
								relativePath: "projects/book/chapter.org",
								revision: "r2",
								type: "document",
							},
						],
						name: "book",
						relativePath: "projects/book",
						type: "directory",
					},
					{
						name: "index.org",
						relativePath: "projects/index.org",
						revision: "r3",
						type: "document",
					},
				],
				name: "projects",
				relativePath: "projects",
				type: "directory",
			},
			{
				children: [],
				name: "z-empty",
				relativePath: "z-empty",
				type: "directory",
			},
			{
				name: "root.org",
				relativePath: "root.org",
				revision: "r1",
				type: "document",
			},
		])
	})
})
