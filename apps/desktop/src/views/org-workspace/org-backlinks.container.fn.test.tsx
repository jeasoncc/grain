import { act, fireEvent, render, screen } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgBacklink } from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { ORG_BACKLINKS_DEBOUNCE_MS, OrgBacklinksContainer } from "./org-backlinks.container.fn"

const { loadOrgBacklinksFlowMock } = vi.hoisted(() => ({
	loadOrgBacklinksFlowMock: vi.fn(),
}))

vi.mock("@/flows/org-workspace", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/flows/org-workspace")>()),
	loadOrgBacklinksFlow: loadOrgBacklinksFlowMock,
}))

const workspace = {
	directories: [],
	documents: [{ relativePath: "target.org", revision: "one" }],
	rootPath: "/notes",
}

const backlink = (label: string, line = 3): OrgBacklink => ({
	column: 2,
	label,
	line,
	sourceHeading: label,
	sourceRelativePath: "target.org",
	sourceTitle: "Target",
	targetKind: "file",
})

const controller = (content: string): OrgWorkspaceController => ({
	activeDocument: { content: "saved", relativePath: "target.org", revision: "one" },
	archiveSubtree: vi.fn(async () => undefined),
	captureTodo: vi.fn(async () => undefined),
	clearDerivedIndex: vi.fn(async () => undefined),
	content,
	createDirectory: vi.fn(async () => undefined),
	createDocument: vi.fn(async () => undefined),
	deleteActiveDocument: vi.fn(async () => undefined),
	derivedIndexStatus: null,
	error: null,
	isDirty: content !== "saved",
	isLoading: false,
	isSaving: false,
	migrateLegacyWorkspace: vi.fn(async () => undefined),
	migrationStatus: null,
	moveActiveDocument: vi.fn(async () => undefined),
	openDefaultWorkspace: vi.fn(async () => undefined),
	openDocument: vi.fn(async () => true),
	openDocumentAt: vi.fn(async () => true),
	openDocumentPath: vi.fn(async () => true),
	openOrgLink: vi.fn(async () => true),
	rebuildDerivedIndex: vi.fn(async () => undefined),
	refileSubtree: vi.fn(async () => undefined),
	refreshWorkspace: vi.fn(async () => undefined),
	revealTarget: null,
	runLegacyRecoveryDrill: vi.fn(async () => undefined),
	saveDocument: vi.fn(async () => undefined),
	selectWorkspace: vi.fn(async () => undefined),
	updateContent: vi.fn(),
	verifyLegacyMigration: vi.fn(async () => undefined),
	workspace,
})

interface Deferred<T> {
	readonly promise: Promise<T>
	readonly resolve: (value: T) => void
}

const deferred = <T,>(): Deferred<T> => {
	let resolvePromise: ((value: T) => void) | undefined
	const promise = new Promise<T>((resolve) => {
		resolvePromise = resolve
	})
	return { promise, resolve: (value) => resolvePromise?.(value) }
}

beforeEach(() => {
	vi.useFakeTimers()
	loadOrgBacklinksFlowMock.mockReset()
})

afterEach(() => {
	vi.useRealTimers()
})

describe("OrgBacklinksContainer", () => {
	it("debounces content changes and loads from the current dirty editor content", async () => {
		loadOrgBacklinksFlowMock.mockReturnValue(() => Promise.resolve(E.right([])))
		const firstController = controller("dirty first")
		const { rerender } = render(<OrgBacklinksContainer controller={firstController} />)

		act(() => vi.advanceTimersByTime(ORG_BACKLINKS_DEBOUNCE_MS - 1))
		expect(loadOrgBacklinksFlowMock).not.toHaveBeenCalled()

		const latestController = { ...firstController, content: "dirty latest" }
		rerender(<OrgBacklinksContainer controller={latestController} />)
		await act(async () => vi.advanceTimersByTimeAsync(ORG_BACKLINKS_DEBOUNCE_MS))

		expect(loadOrgBacklinksFlowMock).toHaveBeenCalledOnce()
		expect(loadOrgBacklinksFlowMock).toHaveBeenCalledWith(workspace, "target.org", "dirty latest")
	})

	it("ignores stale async results from an older content generation", async () => {
		const oldResult = deferred<ReturnType<typeof E.right<never, readonly OrgBacklink[]>>>()
		const newResult = deferred<ReturnType<typeof E.right<never, readonly OrgBacklink[]>>>()
		loadOrgBacklinksFlowMock
			.mockReturnValueOnce(() => oldResult.promise)
			.mockReturnValueOnce(() => newResult.promise)
		const firstController = controller("first")
		const { rerender } = render(<OrgBacklinksContainer controller={firstController} />)
		await act(async () => vi.advanceTimersByTimeAsync(ORG_BACKLINKS_DEBOUNCE_MS))

		rerender(<OrgBacklinksContainer controller={{ ...firstController, content: "second" }} />)
		await act(async () => vi.advanceTimersByTimeAsync(ORG_BACKLINKS_DEBOUNCE_MS))
		await act(async () => newResult.resolve(E.right([backlink("Latest")])))
		await act(async () => oldResult.resolve(E.right([backlink("Stale")])))

		fireEvent.click(screen.getByRole("button", { name: /Backlinks/ }))
		expect(screen.getByText("Latest")).toBeInTheDocument()
		expect(screen.queryByText("Stale")).not.toBeInTheDocument()
	})

	it("navigates same-file backlinks through openDocumentAt", async () => {
		const currentController = controller("unsaved target content")
		loadOrgBacklinksFlowMock.mockReturnValue(() =>
			Promise.resolve(E.right([backlink("Same file", 9)])),
		)
		render(<OrgBacklinksContainer controller={currentController} />)
		await act(async () => vi.advanceTimersByTimeAsync(ORG_BACKLINKS_DEBOUNCE_MS))

		fireEvent.click(screen.getByRole("button", { name: /Backlinks/ }))
		fireEvent.click(screen.getByRole("button", { name: /Same file/ }))
		expect(currentController.openDocumentAt).toHaveBeenCalledWith("target.org", 9)
		expect(currentController.openDocumentPath).not.toHaveBeenCalled()
	})

	it("renders nothing without an active workspace or document", () => {
		const currentController = controller("saved")
		const { container: rendered, rerender } = render(
			<OrgBacklinksContainer controller={{ ...currentController, workspace: null }} />,
		)
		expect(rendered).toBeEmptyDOMElement()

		rerender(<OrgBacklinksContainer controller={{ ...currentController, activeDocument: null }} />)
		expect(rendered).toBeEmptyDOMElement()
	})
})
