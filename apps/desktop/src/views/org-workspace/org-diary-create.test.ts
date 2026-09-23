import { describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { createOrgDiaryFromController } from "./org-workspace.container.fn"

const controllerWith = (overrides: Partial<OrgWorkspaceController> = {}): OrgWorkspaceController =>
	({
		createDirectory: vi.fn(async () => undefined),
		createDocument: vi.fn(async () => undefined),
		openDocument: vi.fn(async () => true),
		workspace: {
			directories: [],
			documents: [],
			rootPath: "/approved",
		},
		...overrides,
	}) as OrgWorkspaceController

describe("createOrgDiaryFromController", () => {
	it("creates a real dated Org file and its diary directory", async () => {
		const controller = controllerWith()

		expect(await createOrgDiaryFromController(controller, new Date("2026-09-20T12:00:00"))).toBe(
			"created",
		)
		expect(controller.createDirectory).toHaveBeenCalledWith("diary")
		expect(controller.createDocument).toHaveBeenCalledWith("diary/2026-09-20.org")
	})

	it("opens today's existing Org diary without rewriting it", async () => {
		const entry = { relativePath: "diary/2026-09-20.org", revision: "revision" }
		const controller = controllerWith({
			workspace: { directories: ["diary"], documents: [entry], rootPath: "/approved" },
		})

		expect(await createOrgDiaryFromController(controller, new Date("2026-09-20T12:00:00"))).toBe(
			"opened",
		)
		expect(controller.openDocument).toHaveBeenCalledWith(entry)
		expect(controller.createDocument).not.toHaveBeenCalled()
	})

	it("does not fall back to SQLite when no Org workspace is open", async () => {
		const controller = controllerWith({ workspace: null })

		expect(await createOrgDiaryFromController(controller)).toBe("no-workspace")
		expect(controller.createDocument).not.toHaveBeenCalled()
	})
})
