import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { ContentType } from "@/types/content"
import { createLegacyContentsRecoverySql } from "./migration.plan.fn"

const sqliteAvailable = spawnSync("sqlite3", ["-version"], { encoding: "utf8" }).status === 0
const temporaryDirectories: string[] = []
const utf8Hex = (value: string): string => Buffer.from(value, "utf8").toString("hex")
const fromUtf8Hex = (value: string): string => Buffer.from(value, "hex").toString("utf8")
const rowQuery =
	"SELECT hex(id)||'|'||hex(node_id)||'|'||hex(content)||'|'||version||'|'||created_at||'|'||updated_at FROM contents ORDER BY id;"

const inferFixtureType = (content: string): ContentType => {
	try {
		const parsed = JSON.parse(content)
		return parsed.root ? "lexical" : "text"
	} catch {
		return "text"
	}
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { force: true, recursive: true })
	}
})

describe.runIf(sqliteAvailable)("legacy recovery SQL destructive drill", () => {
	it("rebuilds a fresh database byte-for-byte from a grain.db copy snapshot", () => {
		const directory = mkdtempSync(join(tmpdir(), "grain-recovery-drill-"))
		temporaryDirectories.push(directory)
		const sourcePath = join(directory, "grain.db.copy")
		const restoredPath = join(directory, "restored.sqlite")
		const firstContent = "quote '\u0000你好"
		const secondContent = '{"root":{"type":"root","children":[]}}'
		const sourceSql = [
			"CREATE TABLE contents (id TEXT PRIMARY KEY NOT NULL, node_id TEXT NOT NULL, content TEXT NOT NULL, version INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);",
			`INSERT INTO contents VALUES (CAST(X'${utf8Hex("content-a")}' AS TEXT),CAST(X'${utf8Hex("dangling-node")}' AS TEXT),CAST(X'${utf8Hex(firstContent)}' AS TEXT),2147483647,9223372036854775807,-9223372036854775808);`,
			`INSERT INTO contents VALUES (CAST(X'${utf8Hex("content-b")}' AS TEXT),CAST(X'${utf8Hex("dangling-node")}' AS TEXT),CAST(X'${utf8Hex(secondContent)}' AS TEXT),1,1,2);`,
		].join("\n")
		const sourceCreated = spawnSync("sqlite3", [sourcePath], {
			encoding: "utf8",
			input: sourceSql,
		})
		expect(sourceCreated.status, sourceCreated.stderr).toBe(0)

		const sourceRows = spawnSync("sqlite3", [sourcePath, rowQuery], { encoding: "utf8" })
		expect(sourceRows.status, sourceRows.stderr).toBe(0)
		const backups = sourceRows.stdout
			.trim()
			.split("\n")
			.map((row, index) => {
				const [id, nodeId, content, version, createdAt, updatedAt] = row.split("|") as [
					string,
					string,
					string,
					string,
					string,
					string,
				]
				const decodedContent = fromUtf8Hex(content)
				return {
					content: decodedContent,
					contentId: fromUtf8Hex(id),
					contentType: inferFixtureType(decodedContent),
					createdAt,
					nodeId: fromUtf8Hex(nodeId),
					path: `Book/_migration-raw-backups/${index}.backup`,
					updatedAt,
					version,
				}
			})

		const restored = spawnSync("sqlite3", [restoredPath], {
			encoding: "utf8",
			input: createLegacyContentsRecoverySql(backups),
		})
		expect(restored.status, restored.stderr).toBe(0)
		const restoredRows = spawnSync("sqlite3", [restoredPath, rowQuery], { encoding: "utf8" })
		expect(restoredRows.status, restoredRows.stderr).toBe(0)
		expect(restoredRows.stdout).toBe(sourceRows.stdout)

		const ownershipCount = spawnSync(
			"sqlite3",
			[restoredPath, "SELECT count(*) FROM contents WHERE node_id='dangling-node';"],
			{ encoding: "utf8" },
		)
		expect(ownershipCount.stdout.trim()).toBe("2")
		const integrity = spawnSync("sqlite3", [restoredPath, "PRAGMA integrity_check;"], {
			encoding: "utf8",
		})
		expect(integrity.status, integrity.stderr).toBe(0)
		expect(integrity.stdout.trim()).toBe("ok")
	})
})
