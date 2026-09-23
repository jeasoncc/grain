import { describe, expect, it } from "vitest"
import { decodeContents } from "./content.codec"

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
})
