import { describe, expect, it } from "vitest"
import type { ContentInterface } from "@/types/content"
import type { NodeInterface, NodeType } from "@/types/node"
import {
	createLegacyContentsRecoverySql,
	planLegacyMigration,
	sanitizeMigrationFilename,
} from "./migration.plan.fn"

const timestamp = "2025-01-01T00:00:00.000Z"

const node = (
	id: string,
	title: string,
	type: NodeType = "file",
	parent: string | null = null,
	order = 0,
): NodeInterface => ({
	createDate: timestamp,
	id,
	lastEdit: timestamp,
	order,
	parent,
	title,
	type,
	workspace: "workspace",
})

const content = (
	id: string,
	nodeId: string,
	value: string,
	contentType: ContentInterface["contentType"],
): ContentInterface => ({ content: value, contentType, id, lastEdit: timestamp, nodeId })

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
	it("emits a byte-exact SQLite recovery script without interpolating source text", () => {
		const sql = createLegacyContentsRecoverySql([
			{
				content: "quote '\u0000你好",
				contentId: "content-1",
				contentType: "text",
				createdAt: "11",
				nodeId: "missing-node",
				path: "ignored",
				updatedAt: "13",
				version: "7",
			},
		])

		expect(sql).not.toContain("quote '")
		expect(sql).toContain("71756f7465202700e4bda0e5a5bd")
		expect(sql).toContain(",7,11,13);")
		expect(sql).toContain("grain_recovery_content_types")
	})

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
		expect(plan.documents[0]?.content).toBe(
			"#+TITLE: First\n#+SOURCE_ID: first\n\nfirst body\nunchanged",
		)
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
				node("sql-folder", "legacy-contents-recovery.sql", "folder", null, 0),
				node("verify-folder", "migration-verification.json", "folder", null, 1),
			],
			workspaceTitle: "Workspace",
		})

		expect(plan.directories.map(({ path }) => path)).toContain(
			"Workspace/legacy-contents-recovery.sql (2)",
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
		const drawingDocument = plan.documents.find(({ nodeId }) => nodeId === "draw")
		const drawingResult = plan.nodeResults.find(({ nodeId }) => nodeId === "draw")
		expect(lexicalDocument?.content).toContain("#+TITLE: Lexical")
		expect(lexicalDocument?.content).toContain("#+SOURCE_ID: lex")
		expect(lexicalDocument?.content).toContain("Hello")
		expect(drawingDocument?.content).toContain("* Migration notice")
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

		expect(plan.documents[0]?.content).toContain("could not be converted")
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
		expect(first.manifest.endsWith("\n")).toBe(true)
		expect(JSON.parse(first.manifest)).toMatchObject({ version: 1, workspaceTitle: "Workspace" })
	})
})
