import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import * as E from "fp-ts/Either"
import type { ComponentType } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearAllLogsFromSQLite, queryLogsFromSQLite } from "@/io/log/log.storage.api"
import type { LogEntry } from "@/types/log/log.interface"
import { ConfirmProvider } from "@/views/ui/confirm"
import { Route } from "./logs"

vi.mock("@/io/log/log.storage.api", () => ({ clearAllLogsFromSQLite: vi.fn(), queryLogsFromSQLite: vi.fn() }))

const Page = Route.options.component as ComponentType
const entry: LogEntry = { id: "isolated-log", timestamp: "2026-10-07T00:00:00Z", level: "info", message: "Isolated log entry" }
let entries: readonly LogEntry[]

beforeEach(() => {
	vi.resetAllMocks()
	entries = [entry]
	vi.mocked(queryLogsFromSQLite).mockImplementation(() => async () => E.right({ entries, total: entries.length, hasMore: false }))
	vi.mocked(clearAllLogsFromSQLite).mockImplementation(() => async () => {
		entries = []
		return E.right(undefined)
	})
})
afterEach(cleanup)

const setup = async () => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const view = render(<QueryClientProvider client={client}><ConfirmProvider><Page /></ConfirmProvider></QueryClientProvider>)
	await screen.findByText(entry.message)
	return view
}

describe("log clearing application decisions", () => {
	it.each(["cancel", "accept", "retire"] as const)("retains logs until a current explicit decision: %s", async (decision) => {
		const view = await setup()
		fireEvent.click(screen.getByRole("button", { name: "Clear" }))
		const dialog = screen.getByRole("dialog")
		const accept = within(dialog).getByRole("button", { name: "Clear" })
		expect(clearAllLogsFromSQLite).not.toHaveBeenCalled()
		expect(entries).toEqual([entry])
		if (decision === "retire") view.unmount()
		await act(async () => {
			fireEvent.click(decision === "cancel" ? within(dialog).getByRole("button", { name: "Cancel" }) : accept)
		})
		expect(clearAllLogsFromSQLite).toHaveBeenCalledTimes(decision === "accept" ? 1 : 0)
		if (decision === "accept") await waitFor(() => { expect(screen.queryByText(entry.message)).not.toBeInTheDocument() })
		else expect(entries).toEqual([entry])
	})

	it("does not retry or enable storage when the explicit operation is refused", async () => {
		vi.mocked(clearAllLogsFromSQLite).mockReturnValue(async () => E.left({ type: "LOG_STORAGE_ERROR", message: "Disabled legacy storage" }))
		await setup()
		fireEvent.click(screen.getByRole("button", { name: "Clear" }))
		await act(async () => {
			fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Clear" }))
		})
		expect(clearAllLogsFromSQLite).toHaveBeenCalledTimes(1)
		expect(screen.getByText(entry.message)).toBeInTheDocument()
		expect(entries).toEqual([entry])
	})
})
