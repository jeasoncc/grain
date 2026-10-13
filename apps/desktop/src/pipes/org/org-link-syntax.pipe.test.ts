import { describe, expect, it } from "vitest"
import { scanOrgBracketLinks } from "./org-link-syntax.pipe"
import { orgRoamIdLink } from "./org-roam.pipe"
import { parseOrgLinkIndex } from "./org-backlinks.pipe"
import { orgLinkTargetAt } from "./org-link.pipe"

describe("Org bracket link source interop", () => {
	it.each(["a b", "literal%20", "bracket[a]b", "slash\\[bracket]", "trailing\\", "Unicode-知识"])("round-trips literal ID identity %j through Org escapes, click navigation and backlinks", (id) => {
		const source = orgRoamIdLink(id, "[A] literal \\ title]]]")
		const links = scanOrgBracketLinks(source)
		expect(links).toHaveLength(1)
		expect(links[0]).toMatchObject({ from: 0, to: source.length, target: `id:${id}` })
		expect(links[0].description).toBe("[A] literal \\ title]\u200B]\u200B]\u200B")
		expect(orgLinkTargetAt(source, 4, "origin.org")).toEqual({ kind: "id", relativePath: null, value: id })
		expect(parseOrgLinkIndex("origin.org", source).links).toMatchObject([{ targetKind: "id", targetValue: id }])
	})
	it("retains single brackets and Unicode whitespace in descriptions but trims Org's ASCII whitespace", () => {
		const source = orgRoamIdLink("uuid", " \t[A] x] y\r\n")
		expect(source).toBe("[[id:uuid][[A] x] y]]")
		expect(scanOrgBracketLinks(source)[0].description).toBe("[A] x] y")
		expect(orgRoamIdLink("uuid", "\u00A0title\u00A0")).toBe("[[id:uuid][\u00A0title\u00A0]]")
		expect(orgRoamIdLink("uuid", "\t \r\n")).toBe("[[id:uuid]]")
	})
	it("keeps multiline selected descriptions followable and backlink-visible without crossing ignored examples", () => {
		const inserted = orgRoamIdLink("uuid", "first\r\nsecond\rlast")
		expect(orgLinkTargetAt(inserted, inserted.length - 3, "origin.org")).toMatchObject({ kind: "id", value: "uuid" })
		const source = `#+begin_src org\n[[id:ignored][unterminated\n#+end_src\nprefix ${inserted}\n`
		expect(parseOrgLinkIndex("origin.org", source).links).toMatchObject([{ targetValue: "uuid", line: 4, column: 7, label: "first\r\nsecond\rlast" }])
	})
})
