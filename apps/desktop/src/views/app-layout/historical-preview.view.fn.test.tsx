import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as TE from "fp-ts/TaskEither"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getLegacyMigrationSnapshot, listLegacyWorkspaces } from "@/io/api/migration.api"
import { dbError } from "@/types/error"
import HistoricalPreview from "./historical-preview.view.fn"

vi.mock("@/io/api/migration.api", () => ({ listLegacyWorkspaces: vi.fn(), getLegacyMigrationSnapshot: vi.fn() }))
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const metadata = { id: "source", name: "Historical source", description: "Original description", createdAt: "9223372036854775807", updatedAt: "-9223372036854775808" }
const snapshot = { graph: { workspace: metadata, nodes: [] }, contents: [{ id: "raw", nodeId: "orphan", content: '<script>untrusted body</script>\u0000raw', contentType: "text" as const, version: "9007199254740993", createdAt: "1", updatedAt: "2" }] }
function mount() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	return render(<QueryClientProvider client={client}><HistoricalPreview /></QueryClientProvider>)
}

describe("historical readonly preview", () => {
	it("selects an exact workspace snapshot and exposes raw bodies only as inert text", async () => {
		vi.mocked(listLegacyWorkspaces).mockReturnValue(TE.right([metadata]))
		vi.mocked(getLegacyMigrationSnapshot).mockReturnValue(TE.right(snapshot))
		mount()
		fireEvent.click(await screen.findByRole("button", { name: /Historical source \(source\)/ }))
		expect(await screen.findByText(snapshot.contents[0].content)).toBeInTheDocument()
		expect(getLegacyMigrationSnapshot).toHaveBeenCalledWith("source")
		expect(document.querySelector("script")).toBeNull()
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
		expect(document.querySelector("[contenteditable=true]")).toBeNull()
	})

	it("does not show a snapshot belonging to another workspace", async () => {
		vi.mocked(listLegacyWorkspaces).mockReturnValue(TE.right([metadata]))
		vi.mocked(getLegacyMigrationSnapshot).mockReturnValue(TE.right({ ...snapshot, graph: { ...snapshot.graph, workspace: { ...metadata, id: "other" } } }))
		mount()
		fireEvent.click(await screen.findByRole("button", { name: /Historical source \(source\)/ }))
		await screen.findByRole("alert")
		expect(screen.queryByText(snapshot.contents[0].content)).not.toBeInTheDocument()
	})

	it("separates an empty historical database from a missing or unsafe native source", async () => {
		vi.mocked(listLegacyWorkspaces).mockReturnValue(TE.right([]))
		const view = mount()
		await screen.findByText("No historical workspaces exist in this database.")
		expect(getLegacyMigrationSnapshot).not.toHaveBeenCalled()
		view.unmount()
		vi.mocked(listLegacyWorkspaces).mockReturnValue(TE.left(dbError("Historical source does not exist")))
		mount()
		expect(await screen.findByRole("alert")).toHaveTextContent("does not exist")
		expect(getLegacyMigrationSnapshot).not.toHaveBeenCalled()
	})
})
