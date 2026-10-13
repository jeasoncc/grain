import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { LegacyRecoveryGraph, LegacyRecoveryNode, LegacyRecoveryWorkspace } from "@/types/org/org.interface"
import { decodeLegacyRecoveryBundle, planLegacyMigration } from "./migration.plan.fn"

const sqliteAvailable = spawnSync("sqlite3", ["-version"], { encoding: "utf8" }).status === 0
const temporaryDirectories: string[] = []
const literal = (value: string): string => `CAST(X'${Buffer.from(value).toString("hex")}' AS TEXT)`
const unhex = (value: string): string => Buffer.from(value, "hex").toString("utf8")
const query = <T>(path: string, sql: string): T => {
	const result = spawnSync("sqlite3", ["-json", path, sql], { encoding: "utf8" })
	expect(result.status, result.stderr).toBe(0)
	return JSON.parse(result.stdout) as T
}
const contentsQuery = "SELECT hex(id) AS id,hex(node_id) AS nodeId,hex(content) AS content,CAST(version AS TEXT) AS version,CAST(created_at AS TEXT) AS createdAt,CAST(updated_at AS TEXT) AS updatedAt FROM contents ORDER BY id;"
const workspaceQuery = "SELECT id,hex(name) AS name,CASE WHEN description IS NULL THEN NULL ELSE hex(description) END AS description,CAST(created_at AS TEXT) AS createdAt,CAST(updated_at AS TEXT) AS updatedAt FROM workspaces ORDER BY id;"
const nodeQuery = "SELECT id,workspace_id AS workspaceId,parent_id AS parentId,hex(title) AS title,node_type AS nodeType,CAST(is_collapsed AS TEXT) AS isCollapsed,CAST(sort_order AS TEXT) AS sortOrder,CASE WHEN tags IS NULL THEN NULL ELSE hex(tags) END AS tags,CAST(created_at AS TEXT) AS createdAt,CAST(updated_at AS TEXT) AS updatedAt FROM nodes ORDER BY id;"

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

describe.runIf(sqliteAvailable)("selected legacy workspace SQLite recovery drill", () => {
	it("restores exact workspace/node/content tuples including cycles, orphans, NUL and i64 extremes after restart", () => {
		const directory = mkdtempSync(join(tmpdir(), "grain-owned-graph-drill-"))
		temporaryDirectories.push(directory)
		const sourcePath = join(directory, "owned-source.sqlite")
		const restoredPath = join(directory, "restored.sqlite")
		const sourceSql = [
			"CREATE TABLE workspaces (id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);",
			"CREATE TABLE nodes (id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,parent_id TEXT,title TEXT NOT NULL,node_type TEXT NOT NULL,is_collapsed INTEGER NOT NULL,sort_order INTEGER NOT NULL,tags TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);",
			"CREATE TABLE contents (id TEXT PRIMARY KEY,node_id TEXT NOT NULL,content TEXT NOT NULL,version INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);",
			`INSERT INTO workspaces VALUES ('workspace',${literal("原始\u0000Workspace")},${literal("description '\u0000📚")},9223372036854775807,-9223372036854775808);`,
			`INSERT INTO nodes VALUES ('folder','workspace','cycle',${literal("Folder 目录")},'folder',9007199254740993,-9007199254740993,${literal('[ "原始" ]')},9223372036854775807,-9223372036854775808);`,
			`INSERT INTO nodes VALUES ('cycle','workspace','folder',${literal("Cycle\u0000")},'folder',0,9223372036854775807,NULL,11,13);`,
			`INSERT INTO nodes VALUES ('child','workspace','folder',${literal("Child '你好")},'file',1,-9223372036854775808,${literal("[]")},9007199254740993,9007199254740995);`,
			`INSERT INTO nodes VALUES ('orphan','workspace','absent',${literal("Orphan")},'unknown-node-type',0,1,NULL,17,19);`,
			`INSERT INTO contents VALUES ('content-a','child',${literal("quote '\u0000你好")},9007199254740993,9223372036854775807,-9223372036854775808);`,
			`INSERT INTO contents VALUES ('content-b','child',${literal('{"root":{"type":"root","children":[]}}')},1,1,2);`,
			`INSERT INTO contents VALUES ('content-folder','folder',${literal("folder content")},3,5,7);`,
			`INSERT INTO contents VALUES ('content-orphan','missing-node',${literal("dangling\u0000📚")},11,13,17);`,
		].join("\n")
		const sourceCreated = spawnSync("sqlite3", [sourcePath], { encoding: "utf8", input: sourceSql })
		expect(sourceCreated.status, sourceCreated.stderr).toBe(0)
		const workspaceRows = query<LegacyRecoveryWorkspace[]>(sourcePath, workspaceQuery)
		const nodeRows = query<LegacyRecoveryNode[]>(sourcePath, nodeQuery)
		const graph: LegacyRecoveryGraph = {
			workspace: { ...workspaceRows[0], name: unhex(workspaceRows[0].name), description: unhex(workspaceRows[0].description!) },
			nodes: nodeRows.map((row) => ({ ...row, title: unhex(row.title), tags: row.tags === null ? null : unhex(row.tags) })),
		}
		const contentRows = query<{ id: string; nodeId: string; content: string; version: string; createdAt: string; updatedAt: string }[]>(sourcePath, contentsQuery)
		const plan = planLegacyMigration({
			graph,
			contents: contentRows.map((row) => ({ ...row, id: unhex(row.id), nodeId: unhex(row.nodeId), content: unhex(row.content), contentType: row.id === Buffer.from("content-b").toString("hex").toUpperCase() ? "lexical" : "unknown/content" })),
		})
		const bundle = decodeLegacyRecoveryBundle({ manifest: plan.manifest, graph: plan.graph, rawBackups: plan.rawBackups, recoverySql: plan.recoverySql })
		const restored = spawnSync("sqlite3", [restoredPath], { encoding: "utf8", input: bundle.recoverySql })
		expect(restored.status, restored.stderr).toBe(0)
		// Each query opens a new SQLite process: no in-memory fixture or live connection is authority.
		expect(query(restoredPath, workspaceQuery)).toEqual(workspaceRows)
		expect(query(restoredPath, nodeQuery)).toEqual(nodeRows)
		expect(query(restoredPath, contentsQuery)).toEqual(contentRows)
		expect(query(restoredPath, "SELECT node_id,count(*) AS count FROM contents GROUP BY node_id ORDER BY node_id;")).toEqual(query(sourcePath, "SELECT node_id,count(*) AS count FROM contents GROUP BY node_id ORDER BY node_id;"))
		expect(query<{ content_id: string; content_type: string }[]>(restoredPath, "SELECT content_id,content_type FROM grain_recovery_content_types ORDER BY content_id;")).toEqual(
			bundle.rawBackups.map((row) => ({ content_id: row.contentId, content_type: row.contentType })).sort((left, right) => left.content_id.localeCompare(right.content_id)),
		)
		expect(query(restoredPath, "PRAGMA integrity_check;")).toEqual([{ integrity_check: "ok" }])
		expect(query<{ name: string }[]>(restoredPath, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").map(({ name }) => name)).toEqual(["contents", "grain_recovery_content_types", "nodes", "workspaces"])
	})
})
