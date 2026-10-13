import * as E from "fp-ts/Either"
import { z } from "zod"
import type { LegacyRecoveryGraph, LegacyRecoveryNode } from "@/types/org/org.interface"
import { exportToOrgmode } from "../export/export.orgmode.fn"

const RECOVERY_DIRECTORY = "_migration-recovered"
const BACKUP_DIRECTORY = "_migration-raw-backups"
const MANIFEST_FILE = "migration-manifest.json"
const RECOVERY_SQL_FILE = "legacy-workspace-recovery.sql"
const VERIFICATION_FILE = "migration-verification.json"
const MAX_COMPONENT_LENGTH = 120

export type MigrationWarningCode =
	| "cycle-detected"
	| "excalidraw-placeholder"
	| "filename-collision"
	| "filename-sanitized"
	| "lexical-conversion-failed"
	| "missing-content"
	| "multiple-content-records"
	| "orphan-parent"

export type MigrationNodeStatus = "directory" | "placeholder" | "ready"

export interface MigrationDirectory {
	readonly kind: "folder" | "support" | "workspace"
	readonly nodeId: string | null
	readonly path: string
}

export interface MigrationOrgDocument {
	readonly content: string
	readonly nodeId: string
	readonly path: string
}

export interface MigrationRawBackup {
	readonly content: string
	readonly contentId: string
	readonly contentType: string
	readonly nodeId: string
	readonly version: string
	readonly createdAt: string
	readonly updatedAt: string
	readonly path: string
}

export interface MigrationNodeResult {
	readonly nodeId: string
	readonly path: string
	readonly status: MigrationNodeStatus
	readonly warnings: readonly MigrationWarningCode[]
}

export interface LegacyMigrationContent {
	readonly id: string
	readonly nodeId: string
	readonly content: string
	readonly contentType: string
	readonly version: string
	readonly createdAt: string
	readonly updatedAt: string
}

export interface LegacyMigrationInput {
	readonly contents: readonly LegacyMigrationContent[]
	readonly graph: LegacyRecoveryGraph
}

interface MigrationNode extends LegacyRecoveryNode {
	readonly parent: string | null
	readonly type: string
}

export interface LegacyMigrationPlan {
	readonly graph: LegacyRecoveryGraph
	readonly directories: readonly MigrationDirectory[]
	readonly documents: readonly MigrationOrgDocument[]
	readonly manifest: string
	readonly manifestPath: string
	readonly recoverySql: string
	readonly recoverySqlPath: string
	readonly nodeResults: readonly MigrationNodeResult[]
	readonly rawBackups: readonly MigrationRawBackup[]
	readonly rootDirectory: string
	readonly warnings: readonly string[]
}

const sqliteUtf8Literal = (value: string): string => {
	const bytes = new TextEncoder().encode(value)
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
	return `CAST(X'${hex}' AS TEXT)`
}

const isCanonicalI64 = (value: string): boolean =>
	/^(?:0|-[1-9]\d*|[1-9]\d*)$/.test(value) &&
	BigInt(value) >= -9223372036854775808n &&
	BigInt(value) <= 9223372036854775807n

const decimalSchema = z.string().refine(isCanonicalI64, "Expected canonical i64 decimal")
const workspaceSchema = z.object({
	id: z.string(), name: z.string(), description: z.string().nullable(),
	createdAt: decimalSchema, updatedAt: decimalSchema,
}).strict()
const nodeSchema = z.object({
	id: z.string(), workspaceId: z.string(), parentId: z.string().nullable(),
	title: z.string(), nodeType: z.string(), isCollapsed: decimalSchema,
	sortOrder: decimalSchema, tags: z.string().nullable(),
	createdAt: decimalSchema, updatedAt: decimalSchema,
}).strict()
const graphSchema = z.object({ workspace: workspaceSchema, nodes: z.array(nodeSchema) }).strict()

export const decodeLegacyRecoveryGraph = (value: unknown): LegacyRecoveryGraph => {
	const graph = graphSchema.parse(value)
	const ids = new Set<string>()
	for (const node of graph.nodes) {
		if (node.workspaceId !== graph.workspace.id || ids.has(node.id)) {
			throw new Error("Invalid selected-workspace recovery graph")
		}
		ids.add(node.id)
	}
	return graph
}

export const decodeLegacyMigrationInput = (value: unknown): LegacyMigrationInput => {
	const input = z.object({
		graph: graphSchema,
		contents: z.array(z.object({
			id: z.string(), nodeId: z.string(), content: z.string(), contentType: z.string(),
			version: decimalSchema, createdAt: decimalSchema, updatedAt: decimalSchema,
		}).strict()),
	}).strict().parse(value)
	const graph = decodeLegacyRecoveryGraph(input.graph)
	const ids = new Set<string>()
	for (const content of input.contents) {
		if (ids.has(content.id)) throw new Error("Duplicate recovery content ID")
		ids.add(content.id)
	}
	return { graph, contents: input.contents }
}

/** The same required version-2 manifest/tuple format accepted by the native reader. */
export const decodeLegacyRecoveryBundle = (value: unknown) => {
	const metadataSchema = z.object({
		path: z.string(), contentId: z.string(), contentType: z.string(), nodeId: z.string(),
		version: decimalSchema, createdAt: decimalSchema, updatedAt: decimalSchema,
	}).strict()
	const bundle = z.object({
		manifest: z.string(), graph: graphSchema,
		rawBackups: z.array(metadataSchema.extend({ content: z.string() })),
		recoverySql: z.string(),
	}).strict().parse(value)
	const manifest = z.object({
		version: z.literal(2), rootDirectory: z.string(), graph: graphSchema,
		rawBackups: z.array(metadataSchema), recoverySqlPath: z.string(),
		directories: z.array(z.unknown()), documents: z.array(z.unknown()),
		nodes: z.array(z.unknown()), warnings: z.array(z.string()),
	}).strict().parse(JSON.parse(bundle.manifest))
	const graph = decodeLegacyRecoveryGraph(bundle.graph)
	if (JSON.stringify(graph) !== JSON.stringify(decodeLegacyRecoveryGraph(manifest.graph))) {
		throw new Error("Recovery graph differs from manifest")
	}
	const safePath = (path: string): boolean =>
		path !== "" && !path.includes("\\") && !path.includes("\u0000") && !/^[A-Za-z]:/.test(path) &&
		path.split("/").every((part) => part !== "" && part !== "." && part !== ".." &&
			!(part.startsWith(".grain-") && part.endsWith(".tmp")))
	const seen = new Set<string>()
	if (!safePath(manifest.rootDirectory) ||
		manifest.recoverySqlPath !== `${manifest.rootDirectory}/${RECOVERY_SQL_FILE}` ||
		bundle.rawBackups.length !== manifest.rawBackups.length) {
		throw new Error("Invalid recovery artifact paths/count")
	}
	for (const [index, backup] of bundle.rawBackups.entries()) {
		const { content: _content, ...metadata } = backup
		if (!safePath(backup.path) ||
			!backup.path.startsWith(`${manifest.rootDirectory}/${BACKUP_DIRECTORY}/`) ||
			seen.has(backup.path) ||
			JSON.stringify(metadata) !== JSON.stringify(manifest.rawBackups[index])) {
			throw new Error("Recovery raw backup differs from manifest")
		}
		seen.add(backup.path)
	}
	if (bundle.recoverySql !== createLegacyWorkspaceRecoverySql(graph, bundle.rawBackups)) {
		throw new Error("Recovery SQL differs from lossless tuples")
	}
	return bundle
}

/** Restore only the selected workspace graph and preserved raw rows into an empty SQLite DB. */
export const createLegacyWorkspaceRecoverySql = (
	inputGraph: LegacyRecoveryGraph,
	backups: readonly MigrationRawBackup[],
): string => {
	const graph = decodeLegacyRecoveryGraph(inputGraph)
	const workspace = graph.workspace
	const contentIds = new Set<string>()
	const integer = (value: string): string => {
		if (!isCanonicalI64(value)) throw new Error("Invalid canonical i64 recovery metadata")
		return value
	}
	const nullableText = (value: string | null): string =>
		value === null ? "NULL" : sqliteUtf8Literal(value)
	const statements = [
		"-- Selected legacy workspace graph and raw contents only; not a whole-database backup.",
		"PRAGMA foreign_keys=OFF;",
		"BEGIN IMMEDIATE;",
		"CREATE TABLE workspaces (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);",
		"CREATE TABLE nodes (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL, parent_id TEXT, title TEXT NOT NULL, node_type TEXT NOT NULL, is_collapsed INTEGER NOT NULL, sort_order INTEGER NOT NULL, tags TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);",
		"CREATE INDEX idx_nodes_workspace ON nodes(workspace_id);",
		"CREATE INDEX idx_nodes_parent ON nodes(parent_id);",
		// No node_id UNIQUE/FK constraint: duplicate and dangling historical rows must survive.
		"CREATE TABLE contents (id TEXT PRIMARY KEY NOT NULL, node_id TEXT NOT NULL, content TEXT NOT NULL, version INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);",
		"CREATE INDEX idx_contents_node ON contents(node_id);",
		"CREATE TABLE grain_recovery_content_types (content_id TEXT PRIMARY KEY NOT NULL, content_type TEXT NOT NULL);",
		`INSERT INTO workspaces (id,name,description,created_at,updated_at) VALUES (${sqliteUtf8Literal(workspace.id)},${sqliteUtf8Literal(workspace.name)},${nullableText(workspace.description)},${integer(workspace.createdAt)},${integer(workspace.updatedAt)});`,
	]
	for (const node of graph.nodes) {
		statements.push(
			`INSERT INTO nodes (id,workspace_id,parent_id,title,node_type,is_collapsed,sort_order,tags,created_at,updated_at) VALUES (${sqliteUtf8Literal(node.id)},${sqliteUtf8Literal(node.workspaceId)},${nullableText(node.parentId)},${sqliteUtf8Literal(node.title)},${sqliteUtf8Literal(node.nodeType)},${integer(node.isCollapsed)},${integer(node.sortOrder)},${nullableText(node.tags)},${integer(node.createdAt)},${integer(node.updatedAt)});`,
		)
	}
	for (const backup of backups) {
		if (contentIds.has(backup.contentId)) throw new Error("Duplicate recovery content ID")
		contentIds.add(backup.contentId)
		statements.push(
			`INSERT INTO contents (id,node_id,content,version,created_at,updated_at) VALUES (${sqliteUtf8Literal(backup.contentId)},${sqliteUtf8Literal(backup.nodeId)},${sqliteUtf8Literal(backup.content)},${integer(backup.version)},${integer(backup.createdAt)},${integer(backup.updatedAt)});`,
			`INSERT INTO grain_recovery_content_types (content_id,content_type) VALUES (${sqliteUtf8Literal(backup.contentId)},${sqliteUtf8Literal(backup.contentType)});`,
		)
	}
	statements.push("COMMIT;")
	return `${statements.join("\n")}\n`
}

interface PathEntry {
	readonly component: string
	readonly collided: boolean
}

const compareText = (left: string, right: string): number =>
	left < right ? -1 : left > right ? 1 : 0

const compareNodes = (left: MigrationNode, right: MigrationNode): number =>
	(BigInt(left.sortOrder) < BigInt(right.sortOrder) ? -1 : BigInt(left.sortOrder) > BigInt(right.sortOrder) ? 1 : 0) ||
	compareText(left.id, right.id) ||
	compareText(left.title, right.title) ||
	compareText(left.type, right.type)

const compareContents = (left: LegacyMigrationContent, right: LegacyMigrationContent): number =>
	(BigInt(right.updatedAt) < BigInt(left.updatedAt) ? -1 : BigInt(right.updatedAt) > BigInt(left.updatedAt) ? 1 : 0) ||
	compareText(left.id, right.id) ||
	compareText(left.contentType, right.contentType) ||
	compareText(left.content, right.content)

/** Make one path component safe on Windows, macOS, and Linux. */
export const sanitizeMigrationFilename = (name: string, fallback = "Untitled"): string => {
	const normalized = name.normalize("NFC")
	const withoutControlCharacters = [...normalized]
		.map((character) => {
			const code = character.charCodeAt(0)
			return code < 32 || code === 127 ? "_" : character
		})
		.join("")
	const withoutInvalidCharacters = withoutControlCharacters
		.replace(/[<>:"/\\|?*]/g, "_")
		.replace(/[. ]+$/g, "")
		.trim()
	const nonEmpty =
		withoutInvalidCharacters === "" || /^\.{1,2}$/.test(withoutInvalidCharacters)
			? fallback
			: withoutInvalidCharacters
	const nonReserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(nonEmpty)
		? `${nonEmpty}_`
		: nonEmpty
	return nonReserved.slice(0, MAX_COMPONENT_LENGTH).replace(/[. ]+$/g, "") || fallback
}

const appendCollisionSuffix = (component: string, index: number, isDocument: boolean): string => {
	const extension = isDocument ? ".org" : ""
	const stem = isDocument ? component.slice(0, -extension.length) : component
	const suffix = ` (${index})`
	return `${stem.slice(0, MAX_COMPONENT_LENGTH - suffix.length - extension.length)}${suffix}${extension}`
}

const allocateComponent = (
	requested: string,
	isDocument: boolean,
	used: Set<string>,
): PathEntry => {
	let component = requested
	let index = 2
	while (used.has(component.toLocaleLowerCase("en-US"))) {
		component = appendCollisionSuffix(requested, index, isDocument)
		index += 1
	}
	used.add(component.toLocaleLowerCase("en-US"))
	return { collided: component !== requested, component }
}

const findCycleNodeIds = (nodesById: ReadonlyMap<string, MigrationNode>): ReadonlySet<string> => {
	const cycleIds = new Set<string>()
	for (const startingId of [...nodesById.keys()].sort(compareText)) {
		const path: string[] = []
		const positions = new Map<string, number>()
		let currentId: string | null = startingId
		while (currentId !== null && nodesById.has(currentId)) {
			const previousPosition = positions.get(currentId)
			if (previousPosition !== undefined) {
				for (const cycleId of path.slice(previousPosition)) {
					cycleIds.add(cycleId)
				}
				break
			}
			positions.set(currentId, path.length)
			path.push(currentId)
			currentId = nodesById.get(currentId)?.parent ?? null
		}
	}
	return cycleIds
}

const metadata = (node: MigrationNode): string => `#+TITLE: ${node.title}\n#+SOURCE_ID: ${node.id}`

const placeholder = (node: MigrationNode, reason: string): string =>
	`${metadata(node)}\n\n* Migration notice\n${reason}\n\nThe original source is preserved in the migration raw-backup artifacts.`

const plainTextDocument = (node: MigrationNode, source: string): string =>
	`${metadata(node)}\n\n${source}`

const contentForNode = (
	node: MigrationNode,
	content: LegacyMigrationContent | undefined,
): {
	readonly content: string
	readonly placeholder: boolean
	readonly warnings: readonly MigrationWarningCode[]
} => {
	if (content === undefined) {
		return { content: metadata(node), placeholder: false, warnings: ["missing-content"] }
	}
	if (content.contentType === "text") {
		return { content: plainTextDocument(node, content.content), placeholder: false, warnings: [] }
	}
	if (content.contentType === "excalidraw") {
		return {
			content: placeholder(
				node,
				"This document contains an Excalidraw drawing that cannot be represented directly in Org mode.",
			),
			placeholder: true,
			warnings: ["excalidraw-placeholder"],
		}
	}
	const converted = exportToOrgmode(content.content, {
		includeProperties: true,
		includeTitle: true,
		properties: { source_id: node.id },
		title: node.title,
	})
	return E.isRight(converted)
		? { content: converted.right, placeholder: false, warnings: [] }
		: {
				content: placeholder(
					node,
					"The legacy Lexical document could not be converted to Org mode.",
				),
				placeholder: true,
				warnings: ["lexical-conversion-failed"],
			}
}

/**
 * Build a complete migration plan. This function performs no IO and never mutates its inputs.
 */
export const planLegacyMigration = (input: LegacyMigrationInput): LegacyMigrationPlan => {
	const { contents, graph: sourceGraph } = decodeLegacyMigrationInput(input)
	const graph: LegacyRecoveryGraph = {
		workspace: sourceGraph.workspace,
		nodes: [...sourceGraph.nodes].sort((left, right) => compareText(left.id, right.id)),
	}
	const rootDirectory = sanitizeMigrationFilename(graph.workspace.name, "Workspace")
	const sortedNodes = graph.nodes
		.map((node): MigrationNode => ({ ...node, parent: node.parentId, type: node.nodeType }))
		.sort(compareNodes)
	const nodesById = new Map(sortedNodes.map((node) => [node.id, node]))
	const uniqueNodes = [...nodesById.values()].sort(compareNodes)
	const cycleIds = findCycleNodeIds(nodesById)
	const isOrphan = (node: MigrationNode): boolean =>
		node.parent !== null &&
		(!nodesById.has(node.parent) || nodesById.get(node.parent)?.type !== "folder")
	const needsRecovery = uniqueNodes.some((node) => cycleIds.has(node.id) || isOrphan(node))

	const contentsByNode = new Map<string, readonly LegacyMigrationContent[]>()
	for (const content of [...contents].sort(compareContents)) {
		contentsByNode.set(content.nodeId, [...(contentsByNode.get(content.nodeId) ?? []), content])
	}

	// Back up every source row, including empty, folder-associated, duplicate, and dangling rows.
	// The Org rendering is a convenience; these artifacts are the lossless migration record.
	const rawSourceContents = [...contents].sort(
		(left, right) => compareText(left.nodeId, right.nodeId) || compareContents(left, right),
	)
	const hasBackups = rawSourceContents.length > 0
	const directories: MigrationDirectory[] = [
		{ kind: "workspace", nodeId: null, path: rootDirectory },
	]
	if (hasBackups) {
		directories.push({
			kind: "support",
			nodeId: null,
			path: `${rootDirectory}/${BACKUP_DIRECTORY}`,
		})
	}
	if (needsRecovery) {
		directories.push(
			{ kind: "support", nodeId: null, path: `${rootDirectory}/${RECOVERY_DIRECTORY}` },
			{ kind: "support", nodeId: null, path: `${rootDirectory}/${RECOVERY_DIRECTORY}/cycles` },
			{ kind: "support", nodeId: null, path: `${rootDirectory}/${RECOVERY_DIRECTORY}/orphans` },
		)
	}

	const childrenByParent = new Map<string | null, MigrationNode[]>()
	for (const node of uniqueNodes) {
		const effectiveParent =
			node.parent !== null && !cycleIds.has(node.id) && !isOrphan(node) ? node.parent : null
		childrenByParent.set(effectiveParent, [...(childrenByParent.get(effectiveParent) ?? []), node])
	}
	for (const children of childrenByParent.values()) {
		children.sort(compareNodes)
	}

	const documents: MigrationOrgDocument[] = []
	const nodeResults: MigrationNodeResult[] = []
	const visited = new Set<string>()

	// The branches mirror the intentionally explicit folder/document recovery states.
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keeping traversal decisions together makes ordering auditable.
	const visitChildren = (parentId: string | null, parentPath: string): void => {
		const siblings = childrenByParent.get(parentId) ?? []
		const used = new Set<string>()
		if (parentId === null && parentPath === rootDirectory) {
			used.add(RECOVERY_DIRECTORY.toLocaleLowerCase("en-US"))
			used.add(BACKUP_DIRECTORY.toLocaleLowerCase("en-US"))
			used.add(MANIFEST_FILE.toLocaleLowerCase("en-US"))
			used.add(RECOVERY_SQL_FILE.toLocaleLowerCase("en-US"))
			used.add(VERIFICATION_FILE.toLocaleLowerCase("en-US"))
		}
		for (const node of siblings) {
			if (visited.has(node.id)) {
				continue
			}
			visited.add(node.id)
			const sanitizedTitle = sanitizeMigrationFilename(node.title)
			const requested = node.type === "folder" ? sanitizedTitle : `${sanitizedTitle}.org`
			const allocated = allocateComponent(requested, node.type !== "folder", used)
			const nodePath = `${parentPath}/${allocated.component}`
			const hierarchyWarnings: MigrationWarningCode[] = []
			if (sanitizedTitle !== node.title) {
				hierarchyWarnings.push("filename-sanitized")
			}
			if (allocated.collided) {
				hierarchyWarnings.push("filename-collision")
			}
			if (cycleIds.has(node.id)) {
				hierarchyWarnings.push("cycle-detected")
			}
			if (isOrphan(node)) {
				hierarchyWarnings.push("orphan-parent")
			}

			if (node.type === "folder") {
				directories.push({ kind: "folder", nodeId: node.id, path: nodePath })
				nodeResults.push({
					nodeId: node.id,
					path: nodePath,
					status: "directory",
					warnings: hierarchyWarnings,
				})
				visitChildren(node.id, nodePath)
				continue
			}

			const nodeContents = contentsByNode.get(node.id) ?? []
			const rendered = contentForNode(node, nodeContents[0])
			const warnings: MigrationWarningCode[] = [
				...hierarchyWarnings,
				...(nodeContents.length > 1 ? ["multiple-content-records" as const] : []),
				...rendered.warnings,
			]
			documents.push({ content: rendered.content, nodeId: node.id, path: nodePath })
			nodeResults.push({
				nodeId: node.id,
				path: nodePath,
				status: rendered.placeholder ? "placeholder" : "ready",
				warnings,
			})
		}
	}

	const rootNodes = childrenByParent.get(null) ?? []
	const normalRoots = rootNodes.filter((node) => !cycleIds.has(node.id) && !isOrphan(node))
	const cycleRoots = rootNodes.filter((node) => cycleIds.has(node.id))
	const orphanRoots = rootNodes.filter((node) => isOrphan(node))
	childrenByParent.set(null, normalRoots)
	visitChildren(null, rootDirectory)
	childrenByParent.set(null, cycleRoots)
	visitChildren(null, `${rootDirectory}/${RECOVERY_DIRECTORY}/cycles`)
	childrenByParent.set(null, orphanRoots)
	visitChildren(null, `${rootDirectory}/${RECOVERY_DIRECTORY}/orphans`)

	const backupNames = new Set<string>()
	const rawBackups: MigrationRawBackup[] = rawSourceContents.map((source) => {
		const nodeTitle = nodesById.get(source.nodeId)?.title ?? "Unmatched content"
		const extension = source.contentType === "text" ? "text.txt" : `${source.contentType}.json`
		const requested = sanitizeMigrationFilename(
			`${sanitizeMigrationFilename(nodeTitle)}--${sanitizeMigrationFilename(source.id, "content")}.${extension}`,
			`content.${extension}`,
		)
		const allocated = allocateComponent(requested, false, backupNames)
		return {
			content: source.content,
			contentId: source.id,
			contentType: source.contentType,
			createdAt: source.createdAt,
			nodeId: source.nodeId,
			path: `${rootDirectory}/${BACKUP_DIRECTORY}/${allocated.component}`,
			updatedAt: source.updatedAt,
			version: source.version,
		}
	})

	const recoverySqlPath = `${rootDirectory}/${RECOVERY_SQL_FILE}`
	const recoverySql = createLegacyWorkspaceRecoverySql(graph, rawBackups)
	const warnings = [...contentsByNode.keys()]
		.filter((nodeId) => !nodesById.has(nodeId))
		.sort(compareText)
		.map((nodeId) => `Content references missing node ${nodeId}`)
	const manifestData = {
		graph,
		directories,
		documents: documents.map(({ content: _content, ...document }) => document),
		nodes: nodeResults,
		rawBackups: rawBackups.map(({ content: _content, ...backup }) => backup),
		recoverySqlPath,
		rootDirectory,
		version: 2,
		warnings,
	}
	return {
		graph,
		directories,
		documents,
		manifest: `${JSON.stringify(manifestData, null, 2)}\n`,
		manifestPath: `${rootDirectory}/${MANIFEST_FILE}`,
		nodeResults,
		rawBackups,
		recoverySql,
		recoverySqlPath,
		rootDirectory,
		warnings,
	}
}

