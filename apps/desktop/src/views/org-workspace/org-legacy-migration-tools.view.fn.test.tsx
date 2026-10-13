import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as TE from "fp-ts/TaskEither"
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createParameterSession } from "@/flows/org-command/parameter-session"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { listLegacyWorkspaces } from "@/io/api/migration.api"
import { dbError } from "@/types/error"
import { ApplicationCommandProvider, useApplicationCommandHost, useApplicationParameterRegistration } from "@/views/application/application-command-provider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/views/ui/dropdown-menu"
import { OrgLegacyMigrationTools } from "./org-legacy-migration-tools.view.fn"

vi.mock("@/io/api/migration.api", () => ({ listLegacyWorkspaces: vi.fn() }))
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }))

afterEach(() => { cleanup(); vi.clearAllMocks() })
const workspaces = ["first", "second"].map((id) => ({ id, name: "Same displayed name", description: null, createdAt: "9223372036854775807", updatedAt: "-9223372036854775808" }))

function ReaderHost({ controller }: { controller: OrgWorkspaceController }) {
	const [parameters] = useState(createParameterSession)
	const snapshot = useSyncExternalStore(parameters.subscribe, parameters.getSnapshot, parameters.getSnapshot)
	const context = useRef({ controller, isBusy: false })
	context.current = { controller, isBusy: false }
	const host = useApplicationCommandHost()
	useLayoutEffect(() => { parameters.attach(); return () => parameters.detach() }, [parameters])
	useApplicationParameterRegistration(parameters, snapshot.session)
	return <DropdownMenu><DropdownMenuTrigger>Migration tools</DropdownMenuTrigger>
		<DropdownMenuContent onCloseAutoFocus={(event) => {
			const session = parameters.getSnapshot().session
			if (session) { event.preventDefault(); queueMicrotask(() => host.focusParameter(session.id)) }
		}}><OrgLegacyMigrationTools controller={controller} isBusy={false} sourcesEnabled onEnableSources={() => {}} parameters={parameters} context={context} /></DropdownMenuContent>
	</DropdownMenu>
}

function setup() {
	vi.mocked(listLegacyWorkspaces).mockReturnValue(TE.right(workspaces))
	const migrate = vi.fn(async () => {})
	const verify = vi.fn(async () => {})
	const drill = vi.fn(async () => {})
	const controller = { workspaceSessionId: "destination-session", activeBufferId: "buffer", workspace: { rootPath: "/approved-destination", capabilityToken: "grant" }, migrateLegacyWorkspace: migrate, verifyLegacyMigration: verify, runLegacyRecoveryDrill: drill } as unknown as OrgWorkspaceController
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const renderHost = (current: OrgWorkspaceController) => <QueryClientProvider client={client}><ApplicationCommandProvider><ReaderHost controller={current} /></ApplicationCommandProvider></QueryClientProvider>
	const view = render(renderHost(controller))
	return { controller, migrate, verify, drill, view, renderHost }
}

async function choose(action = "Migrate legacy workspace") {
	fireEvent.pointerDown(screen.getByRole("button", { name: "Migration tools" }), { button: 0, ctrlKey: false })
	const item = await screen.findByRole("menuitem", { name: action })
	await waitFor(() => expect(item).not.toHaveAttribute("data-disabled"))
	fireEvent.click(item)
	return screen.findByRole("combobox")
}

describe("owned historical migration selection", () => {
	it("survives menu closure and selects the exact duplicate-name workspace once", async () => {
		const test = setup()
		const input = await choose()
		await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument())
		fireEvent.change(input, { target: { value: "second" } })
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(test.migrate).toHaveBeenCalledExactlyOnceWith({ id: "second" }))
		fireEvent.keyDown(window, { key: "Enter", repeat: true })
		expect(test.migrate).toHaveBeenCalledOnce()
		expect(test.verify).not.toHaveBeenCalled()
		expect(test.drill).not.toHaveBeenCalled()
	})

	it("cancels without dispatching any historical migration action", async () => {
		const test = setup()
		const input = await choose("Verify migration")
		fireEvent.keyDown(input, { key: "g", ctrlKey: true })
		await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument())
		expect(test.migrate).not.toHaveBeenCalled()
		expect(test.verify).not.toHaveBeenCalled()
		expect(test.drill).not.toHaveBeenCalled()
	})

	it("does not retarget a pending exact selection to a replacement destination grant", async () => {
		const test = setup()
		const input = await choose("Run recovery drill")
		test.view.rerender(test.renderHost({ ...test.controller, workspace: { ...test.controller.workspace!, capabilityToken: "replacement-grant" } }))
		fireEvent.change(input, { target: { value: "second" } })
		fireEvent.keyDown(input, { key: "Enter" })
		await act(async () => {})
		expect(test.drill).not.toHaveBeenCalled()
	})

	it("makes readonly startup failures visible without offering a mutation workflow", async () => {
		setup()
		vi.mocked(listLegacyWorkspaces).mockReturnValue(TE.left(dbError("Historical SQLite has unsafe WAL sidecars")))
		fireEvent.pointerDown(screen.getByRole("button", { name: "Migration tools" }), { button: 0, ctrlKey: false })
		expect(await screen.findByRole("alert")).toHaveTextContent("unsafe WAL sidecars")
		expect(screen.getByRole("menuitem", { name: "Migrate legacy workspace" })).toHaveAttribute("data-disabled")
	})
})
