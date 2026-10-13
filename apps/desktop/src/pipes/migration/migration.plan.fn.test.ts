import { describe, expect, it } from "vitest"
import type { LegacyRecoveryGraph, LegacyRecoveryNode } from "@/types/org/org.interface"
import {
	decodeLegacyRecoveryBundle,
	planLegacyMigration as planMigration,
	type LegacyMigrationContent,
	sanitizeMigrationFilename,
} from "./migration.plan.fn"

const workspace = {
	id: "workspace", name: "Workspace", description: "真实\u0000metadata",
	createdAt: "9223372036854775807", updatedAt: "-9223372036854775808",
}
const graph = (nodes: readonly LegacyRecoveryNode[] = [], name = "Workspace"): LegacyRecoveryGraph =>
	({ workspace: { ...workspace, name }, nodes })
const planLegacyMigration = ({ contents, nodes, workspaceTitle }: {
	contents: readonly LegacyMigrationContent[]
	nodes: readonly LegacyRecoveryNode[]
	workspaceTitle: string
}) => planMigration({ contents, graph: graph(nodes, workspaceTitle) })

const node = (
	id: string, title: string, nodeType = "file",
	parentId: string | null = null, sortOrder = 0,
): LegacyRecoveryNode => ({
	id, title, nodeType, parentId, sortOrder: String(sortOrder), workspaceId: "workspace",
	isCollapsed: "0", tags: '[ "保留原始 JSON" ]',
	createdAt: "9007199254740993", updatedAt: "-9007199254740993",
})
const content = (
	id: string, nodeId: string, value: string, contentType: string,
): LegacyMigrationContent => ({
	content: value, contentType, id, nodeId,
	version: "9007199254740993", createdAt: "9223372036854775807",
	updatedAt: "-9223372036854775808",
})

const lexical = (text: string): string =>
	JSON.stringify({
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text,
							type: "text",
							version: 1,
						},
					],
					direction: null,
					format: "",
					indent: 0,
					textFormat: 0,
					textStyle: "",
					type: "paragraph",
					version: 1,
				},
			],
			direction: null,
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	})

describe("planLegacyMigration", () => {
	it("preserves nested folder hierarchy and sibling order", () => {
		const nodes = [
			node("later", "Later", "file", "nested", 2),
			node("root", "Drafts", "folder", null, 0),
			node("first", "First", "file", "nested", 0),
			node("nested", "Part One", "folder", "root", 0),
		]
		const contents = [
			content("text-1", "first", "first body\nunchanged", "text"),
			content("text-2", "later", "later body", "text"),
		]

		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: "My Book" })

		expect(plan.directories.filter(({ kind }) => kind === "folder")).toEqual([
			{ kind: "folder", nodeId: "root", path: "My Book/Drafts" },
			{ kind: "folder", nodeId: "nested", path: "My Book/Drafts/Part One" },
		])
		expect(plan.documents.map(({ path }) => path)).toEqual([
			"My Book/Drafts/Part One/First.org",
			"My Book/Drafts/Part One/Later.org",
		])
	})

	it("sanitizes cross-platform names and resolves collisions case-insensitively", () => {
		const nodes = [
			node("a", 'Bad<>:"/\\|?* .', "file", null, 0),
			node("b", "bad_________", "file", null, 1),
			node("c", "CON", "folder", null, 2),
		]
		const plan = planLegacyMigration({ contents: [], nodes, workspaceTitle: "AUX" })

		expect(plan.rootDirectory).toBe("AUX_")
		expect(plan.documents.map(({ path }) => path)).toEqual([
			"AUX_/Bad_________.org",
			"AUX_/bad_________ (2).org",
		])
		expect(plan.nodeResults[1]?.warnings).toContain("filename-collision")
		expect(plan.directories.at(-1)?.path).toBe("AUX_/CON_")
		expect(sanitizeMigrationFilename("... ")).toBe("Untitled")
	})

	it("reserves generated recovery and verification artifact names at the root", () => {
		const plan = planLegacyMigration({
			contents: [],
			nodes: [
				node("sql-folder", "legacy-workspace-recovery.sql", "folder", null, 0),
				node("verify-folder", "migration-verification.json", "folder", null, 1),
			],
			workspaceTitle: "Workspace",
		})

		expect(plan.directories.map(({ path }) => path)).toContain(
			"Workspace/legacy-workspace-recovery.sql (2)",
		)
		expect(plan.directories.map(({ path }) => path)).toContain(
			"Workspace/migration-verification.json (2)",
		)
		expect(plan.nodeResults.every(({ warnings }) => warnings.includes("filename-collision"))).toBe(
			true,
		)
	})

	it("caps combined raw-backup filenames to a portable component length", () => {
		const long = "x".repeat(200)
		const plan = planLegacyMigration({
			contents: [content(long, "node", "source", "lexical")],
			nodes: [node("node", long)],
			workspaceTitle: "Workspace",
		})
		const filename = plan.rawBackups[0]?.path.split("/").at(-1) ?? ""
		expect(filename.length).toBeLessThanOrEqual(120)
	})

	it("uses the Org exporter and backs up every non-empty Lexical or Excalidraw source", () => {
		const nodes = [node("lex", "Lexical"), node("draw", "Drawing", "drawing")]
		const contents = [
			content("valid", "lex", lexical("Hello"), "lexical"),
			content("drawing", "draw", "{drawing-json}", "excalidraw"),
			content("extra", "missing-node", "broken lexical", "lexical"),
		]

		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: "Workspace" })

		const lexicalDocument = plan.documents.find(({ nodeId }) => nodeId === "lex")
		const drawingResult = plan.nodeResults.find(({ nodeId }) => nodeId === "draw")
		expect(lexicalDocument?.content).toContain("Hello")
		expect(drawingResult).toMatchObject({ status: "placeholder" })
		expect(drawingResult?.warnings).toContain("excalidraw-placeholder")
		expect(plan.rawBackups.map(({ contentId }) => contentId)).toEqual(["drawing", "valid", "extra"])
		expect(plan.rawBackups.map(({ content: value }) => value)).toEqual([
			"{drawing-json}",
			lexical("Hello"),
			"broken lexical",
		])
	})

	it("backs up empty, text, folder-associated, and secondary source rows", () => {
		const nodes = [node("folder", "Folder", "folder"), node("doc", "Document")]
		const contents = [
			content("folder-source", "folder", "folder data", "text"),
			content("empty", "doc", "", "lexical"),
			content("secondary", "doc", "secondary", "text"),
		]

		const plan = planLegacyMigration({ contents, nodes, workspaceTitle: "Workspace" })
		expect(plan.rawBackups.map(({ contentId }) => contentId)).toEqual([
			"empty",
			"secondary",
			"folder-source",
		])
		expect(plan.rawBackups.find(({ contentId }) => contentId === "empty")?.content).toBe("")
		expect(plan.rawBackups.find(({ contentId }) => contentId === "folder-source")?.path).toContain(
			".text.txt",
		)
		expect(plan.nodeResults.find(({ nodeId }) => nodeId === "doc")?.warnings).toContain(
			"multiple-content-records",
		)
	})

	it("emits a readable placeholder and raw backup when Lexical conversion fails", () => {
		const plan = planLegacyMigration({
			contents: [content("source", "bad", "not json", "lexical")],
			nodes: [node("bad", "Broken")],
			workspaceTitle: "Workspace",
		})

		expect(plan.nodeResults[0]).toMatchObject({
			status: "placeholder",
			warnings: ["lexical-conversion-failed"],
		})
		expect(plan.rawBackups[0]?.content).toBe("not json")
	})

	it("recovers orphaned and cyclic nodes without dropping descendants", () => {
		const nodes = [
			node("orphan", "Orphan", "file", "absent"),
			node("cycle-a", "A", "folder", "cycle-b"),
			node("cycle-b", "B", "folder", "cycle-a"),
			node("child", "Child", "file", "cycle-a"),
		]

		const plan = planLegacyMigration({ contents: [], nodes, workspaceTitle: "Workspace" })

		expect(plan.nodeResults.find(({ nodeId }) => nodeId === "orphan")).toMatchObject({
			path: "Workspace/_migration-recovered/orphans/Orphan.org",
			warnings: expect.arrayContaining(["orphan-parent"]),
		})
		expect(plan.nodeResults.find(({ nodeId }) => nodeId === "cycle-a")).toMatchObject({
			path: "Workspace/_migration-recovered/cycles/A",
			warnings: expect.arrayContaining(["cycle-detected"]),
		})
		expect(plan.nodeResults.find(({ nodeId }) => nodeId === "child")?.path).toBe(
			"Workspace/_migration-recovered/cycles/A/Child.org",
		)
		expect(plan.nodeResults).toHaveLength(nodes.length)
	})

	it("is deterministic regardless of input array ordering", () => {
		const nodes = [node("b", "Same", "file", null, 0), node("a", "Same", "file", null, 0)]
		const contents = [
			content("content-b", "b", "B", "text"),
			content("content-a", "a", "A", "text"),
		]
		const first = planLegacyMigration({ contents, nodes, workspaceTitle: "Workspace" })
		const second = planLegacyMigration({
			contents: [...contents].reverse(),
			nodes: [...nodes].reverse(),
			workspaceTitle: "Workspace",
		})

		expect(second).toEqual(first)
		expect(JSON.parse(first.manifest).graph).toEqual(first.graph)
	})

	it("keeps exact graph tuples and parent links despite orphan/cycle rendering", () => {
		const nodes = [
			node("folder", "Folder", "folder", "child"),
			{ ...node("child", "原始\u0000Title", "unknown", "folder"), sortOrder: "9223372036854775807", isCollapsed: "-9223372036854775808" },
			node("orphan", "Orphan", "file", "unexported-parent"),
		]
		const plan = planMigration({ graph: graph(nodes), contents: [content("raw", "orphan", "\u0000你好", "unknown/content")] })
		const bundle = decodeLegacyRecoveryBundle({
			manifest: plan.manifest, graph: plan.graph, rawBackups: plan.rawBackups,
			recoverySql: plan.recoverySql,
		})
		expect(bundle.graph).toEqual(plan.graph)
		expect(bundle.graph.nodes.map(({ id, parentId }) => [id, parentId])).toEqual([
			["child", "folder"], ["folder", "child"], ["orphan", "unexported-parent"],
		])
		expect(bundle.rawBackups[0].content).toBe("\u0000你好")
		expect(bundle.rawBackups[0].version).toBe("9007199254740993")
	})

	it.each(["9007199254740993.0", "9223372036854775808", "-0", "01"])(
		"rejects invalid i64 graph metadata %s rather than rounding/defaulting",
		(createdAt) => {
			expect(() => planMigration({
				graph: { ...graph(), workspace: { ...workspace, createdAt } }, contents: [],
			})).toThrow()
		},
	)

	it("rejects old/optional graphs, unknown fields and corrupt SQL/graph receipts", () => {
		const plan = planMigration({ graph: graph([node("child", "Child")]), contents: [] })
		const bundle = { manifest: plan.manifest, graph: plan.graph, rawBackups: [], recoverySql: plan.recoverySql }
		expect(() => decodeLegacyRecoveryBundle({ ...bundle, graph: undefined })).toThrow()
		expect(() => decodeLegacyRecoveryBundle({ ...bundle, recoverySql: null })).toThrow()
		expect(() => decodeLegacyRecoveryBundle({ ...bundle, oldAlias: true })).toThrow()
		expect(() => decodeLegacyRecoveryBundle({ ...bundle, recoverySql: `${plan.recoverySql}DROP TABLE nodes;` })).toThrow()
		expect(() => decodeLegacyRecoveryBundle({
			...bundle, graph: { ...plan.graph, workspace: { ...workspace, name: "Changed" } },
		})).toThrow()
	})
})
