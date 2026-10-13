import { describe, expect, it } from "vitest"
import { decodeContents, decodeLegacyMigrationContents } from "./content.codec"

describe("decodeContents", () => {
	it("infers legacy type because the database has no content-type column", () => {
		const [content, drawing] = decodeContents([
			{
				content: "{malformed legacy lexical source}",
				contentType: "lexical",
				createdAt: 1_735_689_600_000,
				id: "content-dangling",
				nodeId: "missing-node",
				updatedAt: 1_735_689_600_000,
				version: 1,
			},
			{
				content: '{"type":"excalidraw","elements":[]}',
				contentType: "lexical",
				createdAt: 1_735_689_600_000,
				id: "content-drawing",
				nodeId: "drawing-node",
				updatedAt: 1_735_689_600_000,
				version: 1,
			},
		])

		expect(content).toMatchObject({
			contentType: "text",
			id: "content-dangling",
			nodeId: "missing-node",
		})
		expect(drawing?.contentType).toBe("excalidraw")
	})

	it("retains migration i64 decimals and NUL/Unicode without deriving an ISO date", () => {
		const [content] = decodeLegacyMigrationContents([{
			id: "raw", nodeId: "missing", content: "\u0000原始📚",
			version: "9007199254740993", createdAt: "9223372036854775807",
			updatedAt: "-9223372036854775808",
		}])
		expect(content).toEqual({
			id: "raw", nodeId: "missing", content: "\u0000原始📚", contentType: "text",
			version: "9007199254740993", createdAt: "9223372036854775807",
			updatedAt: "-9223372036854775808",
		})
		expect(content).not.toHaveProperty("lastEdit")
	})
})
