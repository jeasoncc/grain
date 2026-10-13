import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { lazy, Suspense, useEffect } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getDesktopMode } from "@/io/api/desktop-mode.api"
import type { DesktopMode } from "@/io/api/desktop-mode.api"
import { dbError } from "@/types/error"
import type { AppError } from "@/types/error"
import { HistoricalAccessBoundary } from "./historical-access-boundary.view.fn"

vi.mock("@/io/api/desktop-mode.api", () => ({ getDesktopMode: vi.fn() }))

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

const setup = () => {
	let resolve!: (result: E.Either<AppError, DesktopMode>) => void
	const decision = new Promise<E.Either<AppError, DesktopMode>>((done) => { resolve = done })
	vi.mocked(getDesktopMode).mockReturnValue(() => decision)
	const initializeBusiness = vi.fn()
	const stopBusiness = vi.fn()
	const loader = vi.fn(async () => ({
		default: function LegacyBusiness() {
			useEffect(() => {
				initializeBusiness()
				return stopBusiness
			}, [])
			return <div>Historical workspace content</div>
		},
	}))
	const Business = lazy(loader)
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const view = render(
		<QueryClientProvider client={client}>
			<HistoricalAccessBoundary>
				<Suspense fallback={<div>Loading business</div>}><Business /></Suspense>
			</HistoricalAccessBoundary>
		</QueryClientProvider>,
	)
	return { resolve, loader, initializeBusiness, stopBusiness, client, view }
}

describe("lazy legacy access boundary", () => {
	it("never loads or initializes legacy business while unresolved or in Org mode", async () => {
		const test = setup()
		expect(test.loader).not.toHaveBeenCalled()
		expect(test.initializeBusiness).not.toHaveBeenCalled()
		await act(async () => test.resolve(E.right("org")))
		await screen.findByText("Legacy SQLite tools require explicit native legacy mode.")
		expect(test.loader).not.toHaveBeenCalled()
		expect(test.initializeBusiness).not.toHaveBeenCalled()
		test.client.clear()
	})

	it("surfaces mode failure without loading business or granting legacy authority", async () => {
		const test = setup()
		await act(async () => test.resolve(E.left(dbError("native mode unavailable"))))
		await screen.findByRole("alert")
		expect(screen.getByText("native mode unavailable")).toBeInTheDocument()
		expect(test.loader).not.toHaveBeenCalled()
		expect(test.initializeBusiness).not.toHaveBeenCalled()
		test.client.clear()
	})

	it("loads business only after explicit legacy authorization and tears it down on exit", async () => {
		const test = setup()
		await act(async () => test.resolve(E.right("legacy")))
		await screen.findByText("Historical workspace content")
		await waitFor(() => expect(test.initializeBusiness).toHaveBeenCalledOnce())
		expect(test.loader).toHaveBeenCalledOnce()
		test.view.unmount()
		expect(test.stopBusiness).toHaveBeenCalledOnce()
		test.client.clear()
	})
})
