import { useRef, useState } from "react"
import * as E from "fp-ts/Either"
import type { OrgWorkspaceController } from "./use-org-workspace"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import type { ApplicationCommandResult } from "@/views/application/application-command-provider"
import { createOrgBabelExecution, type OrgBabelExecution } from "@/flows/org-execution/org-babel-execution"
import { orgExecutionService } from "@/io/execution/org-execution.service"
import { orgFileRepository } from "@/io/file/org-file.repository"
import { saveOrgExport, type OrgExportSaveOutcome } from "@/io/file/org-export.service"
import { exportOrgSource } from "@/pipes/org/org-export.pipe"
import type { OrgTextEditBatch } from "@/pipes/org/org-text.pipe"
import { useTrustedCompiledExtension } from "@/views/application/trusted-compiled-extension"

export interface OrgSourceExportTool {
	readonly id: string
	readonly sourcePath: string
	readonly format: "html" | "markdown"
	readonly content: string
	readonly mediaType: string
	readonly origin: ApplicationToolOrigin
	readonly isCurrent: () => boolean
	readonly save: () => Promise<OrgExportSaveOutcome>
}

/** Snapshot producers have no body authority; only the captured Source target can commit. */
export function useOrgSourceTools({ controller, getTarget, captureOrigin }: {
	readonly controller: OrgWorkspaceController
	readonly getTarget: () => OrgEditorCommandTarget | null
	readonly captureOrigin: () => ApplicationToolOrigin | null
}) {
	const ports = useRef({ controller, getTarget, captureOrigin })
	ports.current = { controller, getTarget, captureOrigin }
	const [babelTools, setBabelTools] = useState<readonly OrgBabelExecution[]>([])
	const [exports, setExports] = useState<readonly OrgSourceExportTool[]>([])
	const identity = useRef({})
	const extension = useTrustedCompiledExtension({ identity: identity.current,
		captureSource: () => ports.current.getTarget()?.captureSourceTransform?.() ?? null })
	const capture = () => {
		const current = ports.current.controller
		const target = ports.current.getTarget()
		const workspace = current.workspace
		if (!target || !workspace?.capabilityToken) return null
		const lifetime = extension.current
		const transform = lifetime?.captureSource()
		if (!transform || !lifetime) return null
		const context = transform.snapshot
		const buffer = current.liveBuffers.find((candidate) => candidate.document.relativePath === context.relativePath && candidate.runtime.source === context.content && !candidate.runtime.closed)
		if (!buffer) return null
		const { runtime, document } = buffer
		const origin = ports.current.captureOrigin()
		if (!origin?.isLive()) return null
		const permit = current.captureBufferWindowPermit(context.windowId, runtime.key.bufferId)
		const scopeCurrent = () => {
			const live = ports.current.controller
			return live.workspaceSessionId === current.workspaceSessionId && live.workspace?.rootPath === workspace.rootPath &&
				live.workspace?.capabilityToken === workspace.capabilityToken && !runtime.closed && origin.isLive() &&
				live.liveBuffers.some((buffer) => buffer.runtime === runtime && buffer.document.relativePath === document.relativePath) &&
				permit()
		}
		const isCurrent = () => scopeCurrent() && transform.isCurrent()
		const applyResults = (expectedSource: string, batch: OrgTextEditBatch): Promise<boolean> =>
			isCurrent() && expectedSource === context.content ? transform.apply(batch) : Promise.resolve(false)
		const validateDisk = async () => {
			if (!isCurrent()) return false
			let valid = false
			const read = lifetime.read(
				() => orgFileRepository.readDocument({ workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken!, relativePath: document.relativePath })(),
				(result) => { valid = isCurrent() && E.isRight(result) && result.right.relativePath === document.relativePath && result.right.revision === document.revision },
			)
			await read.done
			return valid
		}
		return { workspace, context, origin, lifetime, isCurrent, applyResults, validateDisk,
			path: `${workspace.rootPath.replace(/\/+$/, "")}/${document.relativePath}` }
	}
	const captureBabel = (executionKind: "babel" | "table"): (() => ApplicationCommandResult) | null => {
		const captured = capture()
		if (!captured || captured.context.readOnly) return null
		return () => {
			if (!captured.isCurrent()) return { kind: "rejected", message: "The captured Babel Source window changed" }
			const execution = createOrgBabelExecution({ executionKind, workspaceRoot: captured.workspace.rootPath, capabilityToken: captured.workspace.capabilityToken!,
				path: captured.path, source: captured.context.content, cursor: captured.context.cursor, origin: captured.origin,
				isCurrent: captured.isCurrent, validateDisk: captured.validateDisk, applyResults: captured.applyResults }, orgExecutionService)
			captured.lifetime.ownProducer(execution.retire)
			setBabelTools((tools) => [...tools.filter((tool) => !tool.getSnapshot().closed), execution])
			return { kind: "success", message: `${executionKind === "table" ? "Table recalculation" : "Babel"} tool opened. No code has run; choose an interpreter and request native consent.` }
		}
	}
	const captureExport = (format: "html" | "markdown"): (() => ApplicationCommandResult) | null => {
		const captured = capture()
		if (!captured) return null
		return () => {
			if (!captured.isCurrent()) return { kind: "rejected", message: "The captured export Source window changed" }
			const result = exportOrgSource(captured.context.content, { format })
			if (result.kind === "rejected") return { kind: "rejected", message: result.message }
			const filename = captured.context.relativePath.slice(captured.context.relativePath.lastIndexOf("/") + 1).replace(/\.org$/i, "")
			const tool: OrgSourceExportTool = Object.freeze({ id: crypto.randomUUID(), sourcePath: captured.context.relativePath, format,
				content: result.content, mediaType: result.mediaType, origin: captured.origin, isCurrent: captured.isCurrent,
				save: async () => {
					if (!captured.isCurrent()) throw new Error("The captured export Source retired; output remains copyable")
					return captured.lifetime.accept(() => saveOrgExport({ format, suggestedName: `${filename}.${result.extension}`, content: result.content,
						workspaceRoot: captured.workspace.rootPath, capabilityToken: captured.workspace.capabilityToken! }))
				} })
			setExports((tools) => [...tools, tool])
			return { kind: "success", message: `${format === "html" ? "HTML" : "Markdown"} export preview opened; no file was written` }
		}
	}
	return { babelTools, exports, captureBabel, captureExport,
		closeBabel: (execution: OrgBabelExecution) => setBabelTools((tools) => tools.filter((tool) => tool !== execution)),
		closeExport: (id: string) => setExports((tools) => tools.filter((tool) => tool.id !== id)),
	}
}
