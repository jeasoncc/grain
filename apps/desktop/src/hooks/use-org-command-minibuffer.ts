import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
	type RefObject,
} from "react"
import {
	guardOrgCommandOrigin,
	type OrgBufferCommand,
	type OrgBufferCommandContext,
	type OrgBufferCommandPreparation,
} from "@/flows/org-command/org-buffer-command"
import {
	executeOrgArchiveCommand,
	executeOrgRefileCommand,
	prepareOrgArchiveCommand,
	prepareOrgRefileCommand,
} from "@/flows/org-command/org-refile.command"
import type {
	OrgMinibufferSession,
	OrgMinibufferAcceptResult,
} from "@/types/editor/minibuffer.interface"
import {
	createOrgRefileTargetSnapshot,
	orgRefileTargetCandidates,
	RootCandidateLabel,
} from "@/pipes/org/org-refile-target.pipe"
import { extractOrgSubtreeAt } from "@/pipes/org/org-subtree-refile.pipe"
import { planOrgSameFileRefile } from "@/pipes/org/org-same-file-refile.pipe"
import { buildOrgSparseTreePlan, parseOrgSparseTreeQuery } from "@/pipes/org/org-sparse-tree.pipe"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgWorkspaceController } from "./use-org-workspace"

import { createParameterSession, type ParameterLease } from "@/flows/org-command/parameter-session"

type ParameterDescription = Pick<
	OrgMinibufferSession,
	"prompt" | "historyKey" | "completion" | "cancelWhileAccepting" | "acceptCandidate"
>
type ParameterCommit = (
	origin: OrgBufferCommandContext,
	current: OrgWorkspaceController,
	target: OrgEditorCommandTarget,
	finish: (message: string, persistent?: boolean) => void,
	input: string,
	lease: ParameterLease,
) => OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>

/** Shared parameter ownership; pure buffer transactions and explicit transfer effects remain distinct. */
export const useOrgCommandMinibuffer = (
	controller: OrgWorkspaceController,
	isBusy: boolean,
	targetRef: RefObject<OrgEditorCommandTarget | null>,
	suspended = false,
) => {
	const [core] = useState(createParameterSession)
	const { session } = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
	const [echo, setEcho] = useState<string | null>(null)
	const originGateRef = useRef<{ lease: ParameterLease; isActive: () => boolean } | null>(null)
	const lookupRef = useRef<{
		abort: AbortController
		lease: ParameterLease
		isActive: () => boolean
	} | null>(null)
	const abortLookup = () => {
		const lookup = lookupRef.current
		if (lookup) {
			lookupRef.current = null
			core.endRead(lookup.lease, lookup.abort)
			lookup.abort.abort()
		}
	}
	const persistentEchoRef = useRef(false)
	const runtimeRef = useRef({ controller, isBusy, suspended })
	runtimeRef.current = { controller, isBusy, suspended }
	useLayoutEffect(() => {
		core.attach()
		setEcho(null)
		return () => {
			core.detach()
			lookupRef.current = null
		}
	}, [
		core,
		controller.workspace?.rootPath,
		controller.workspace?.capabilityToken,
		controller.workspaceSessionId,
		controller.activeBufferId,
		controller.activeDocument?.relativePath,
	])
	useLayoutEffect(() => {
		const origin = originGateRef.current
		if (origin && core.current(origin.lease) && !origin.isActive()) core.retire(origin.lease)
		if (lookupRef.current && !lookupRef.current.isActive()) {
			const lease = lookupRef.current.lease
			abortLookup()
			core.retire(lease)
		}
		if (suspended) {
			const lease = core.getSnapshot().lease
			if (lease) core.retire(lease)
			setEcho(null)
		}
	})
	useEffect(() => {
		if (!echo || persistentEchoRef.current) return
		const timer = window.setTimeout(() => setEcho(null), 3500)
		return () => window.clearTimeout(timer)
	}, [echo])

	const launch = (
		description: ParameterDescription,
		prepare: (context: OrgBufferCommandContext) => OrgBufferCommandPreparation,
		cursor: number,
		commit: ParameterCommit,
		previous?: ParameterLease,
	) => {
		const document = controller.activeDocument
		const target = targetRef.current
		if (!document || !target || isBusy || suspended || (!previous && core.busy())) return
		const prepared = prepare({
			relativePath: document.relativePath,
			content: controller.content,
			cursor,
		})
		if (prepared.kind === "rejected") {
			setEcho(prepared.message)
			return
		}
		const root = controller.workspace?.rootPath
		const grant = controller.workspace?.capabilityToken
		const workspaceSessionId = controller.workspaceSessionId
		const activeBufferId = controller.activeBufferId
		const originFocus = globalThis.document?.activeElement
		const lease = core.begin(previous)
		if (!lease) return
		const sessionId = lease.id
		setEcho(null)
		const originIsActive = () =>
			!runtimeRef.current.suspended &&
			core.current(lease) &&
			runtimeRef.current.controller.workspace?.rootPath === root &&
			runtimeRef.current.controller.workspace?.capabilityToken === grant &&
			runtimeRef.current.controller.workspaceSessionId === workspaceSessionId &&
			runtimeRef.current.controller.activeBufferId === activeBufferId &&
			runtimeRef.current.controller.activeDocument?.relativePath ===
				prepared.context.relativePath &&
			targetRef.current === target
		originGateRef.current = { lease, isActive: originIsActive }
		let completionFocus: { before: Element; host: Element } | null = null
		const captureCompletionFocus = () => {
			const before = globalThis.document?.activeElement
			const host = before?.closest("[data-org-parameter-session]")
			return before && host?.getAttribute("data-org-parameter-session") === String(lease.id)
				? { before, host }
				: null
		}
		const finish = (message: string, persistent = false) => {
			if (!originIsActive()) return
			const focus = completionFocus
			// Ownership follows the original host, not an input that publication may replace.
			const before = globalThis.document?.activeElement
			const ownsFocus = Boolean(
				focus?.host.isConnected &&
					focus.host.getAttribute("data-org-parameter-session") === String(lease.id) &&
					focus.host.contains(before ?? null),
			)
			if (!core.retire(lease) || !core.isAttached() || targetRef.current !== target) return
			persistentEchoRef.current = persistent
			setEcho(message)
			const after = globalThis.document?.activeElement
			if (
				ownsFocus &&
				focus &&
				(after === before || (before && !before.isConnected && after === globalThis.document?.body))
			)
				target.restoreFocus()
		}
		core.publishSession(lease, {
			...description,
			id: sessionId,
			initialInput: prepared.initialInput,
			candidates: prepared.candidates,
			onCancel: () => {
				if (!originIsActive()) return
				const before = globalThis.document?.activeElement
				const ownsFocus =
					(before === originFocus && before !== globalThis.document?.body && before?.isConnected) ||
					(before === globalThis.document?.body &&
						Boolean(originFocus && !originFocus.isConnected)) ||
					before
						?.closest("[data-org-parameter-session]")
						?.getAttribute("data-org-parameter-session") === String(lease.id)
				if (core.cancel(lease) && core.isAttached() && targetRef.current === target) {
					persistentEchoRef.current = false
					setEcho("Canceled")
					const after = globalThis.document?.activeElement
					if (
						ownsFocus &&
						(after === before ||
							(before && !before.isConnected && after === globalThis.document?.body))
					)
						target.restoreFocus()
				}
			},
			onAccept: (input) => {
				const current = runtimeRef.current
				if (!originIsActive())
					return { ok: false, message: "The originating command or buffer is no longer active." }
				if (
					current.isBusy ||
					current.controller.isSaving ||
					current.controller.isLoading ||
					core.busy()
				)
					return {
						ok: false,
						message: "The buffer is saving or loading. Try again when it finishes.",
					}
				const guard = guardOrgCommandOrigin(prepared.context, {
					relativePath: current.controller.activeDocument?.relativePath ?? "",
					content: current.controller.content,
					cursor,
				})
				if (guard) return { ok: false, message: guard.message }
				completionFocus = captureCompletionFocus()
				return (
					core.accept(lease, originIsActive, description.cancelWhileAccepting === false, () =>
						commit(prepared.context, current.controller, target, finish, input, lease),
					) ?? { ok: false, message: "The originating command or buffer is no longer active." }
				)
			},
		})
	}
	const open = (command: OrgBufferCommand, cursor: number) =>
		launch(
			{ historyKey: command.id, prompt: command.prompt, completion: command.completion },
			command.prepare,
			cursor,
			(origin, current, target, finish, input) => {
				const result = command.execute(
					origin,
					{
						relativePath: current.activeDocument?.relativePath ?? "",
						content: current.content,
						cursor,
					},
					input,
				)
				if (result.kind === "rejected") return { ok: false, message: result.message }
				if (result.kind === "view" && !target.applyView?.(origin.content, result.view))
					return {
						ok: false,
						message: "This editor cannot apply the view, or the buffer changed. Cancel and retry.",
					}
				if (result.kind === "edit" && !target.applyEdit(origin.content, result.edit))
					return {
						ok: false,
						message: "The buffer changed before the command could be applied. Cancel and retry.",
					}
				if (result.kind === "view" && result.view.query !== null) {
					const query = parseOrgSparseTreeQuery(result.view.query)
					if (
						query &&
						buildOrgSparseTreePlan(origin.content, query).matchedHeadingStarts.length === 0
					) {
						finish("No sparse-tree matches; the whole document remains visible.")
						return { ok: true }
					}
				}
				finish(result.kind === "no-change" ? command.unchangedMessage : command.updatedMessage)
				return { ok: true }
			},
		)
	const openTransfer = (archive: boolean, cursor: number) => {
		if (archive && controller.isDirty) {
			setEcho("Save the current document before refiling or archiving a subtree.")
			return
		}
		const description: ParameterDescription = {
			historyKey: archive ? "org.subtree.archive" : "org.subtree.refile",
			prompt: archive ? "Archive subtree (yes/no):" : "Refile to Org file:",
			completion: "value",
			cancelWhileAccepting: archive ? false : true,
		}
		const prepare = archive
			? prepareOrgArchiveCommand
			: (context: OrgBufferCommandContext) =>
					prepareOrgRefileCommand(
						context,
						controller.workspace?.documents.map((document) => document.relativePath) ?? [],
					)
		launch(description, prepare, cursor, async (origin, current, _target, finish, input, lease) => {
			if (
				(archive && current.isDirty) ||
				current.openBuffers?.some(
					(buffer) =>
						buffer.bufferId === current.activeBufferId &&
						(buffer.hasConflict || buffer.autosavePaused),
				)
			)
				return {
					ok: false,
					message: "Save the current document before refiling or archiving a subtree.",
				}
			const currentContext = {
				relativePath: current.activeDocument?.relativePath ?? "",
				content: current.content,
				cursor,
			}
			const result = archive
				? executeOrgArchiveCommand(origin, currentContext, input)
				: executeOrgRefileCommand(origin, currentContext, input)
			if (result.kind === "rejected") return { ok: false, message: result.message }
			if (result.kind === "cancel") {
				finish("Canceled")
				return { ok: true }
			}
			if (result.kind === "local" && "targetRelativePath" in result) {
				// Canonical memory only: no target RPC, persistent index, or loading owner.
				const snapshot = createOrgRefileTargetSnapshot(origin.relativePath, "", origin.content)
				const moved = extractOrgSubtreeAt(origin.content, origin.cursor)!
				const candidates = orgRefileTargetCandidates(snapshot, true).filter(
					(candidate) =>
						candidate.kind === "root" ||
						candidate.target.from < moved.from ||
						candidate.target.from >= moved.to,
				)
				launch(
					{
						prompt: "Refile under heading:",
						historyKey: "org.subtree.refile.heading",
						completion: "value",
						acceptCandidate: true,
					},
					() => ({
						kind: "ready",
						context: origin,
						initialInput: RootCandidateLabel,
						candidates: candidates.map((candidate) => candidate.label),
					}),
					cursor,
					(headingOrigin, live, editor, retire, label) => {
						if (
							live.openBuffers?.some(
								(buffer) =>
									buffer.bufferId === live.activeBufferId &&
									(buffer.hasConflict || buffer.autosavePaused),
							)
						)
							return { ok: false, message: "Resolve the current buffer conflict before refiling." }
						const candidate = candidates.find((entry) => entry.label === label)
						if (!candidate)
							return {
								ok: false,
								message: "Choose an exact target heading from the completion list.",
							}
						const plan = planOrgSameFileRefile(
							live.content,
							headingOrigin.cursor,
							headingOrigin.content,
							candidate.kind === "heading" ? candidate.target : undefined,
						)
						if (plan.kind === "rejected") return { ok: false, message: plan.message }
						if (!editor.applyEdits)
							return { ok: false, message: "This editor does not support atomic refile batches." }
						if (!editor.applyEdits?.(headingOrigin.content, plan.batch))
							return {
								ok: false,
								message: "The originating editor cannot apply this move. Cancel and retry.",
							}
						retire(plan.kind === "no-change" ? "Subtree already in place" : "Subtree refiled")
						return { ok: true }
					},
					lease,
				)
				return { ok: true }
			}
			if (
				current.isDirty ||
				current.openBuffers?.some(
					(buffer) => buffer.bufferId === current.activeBufferId && buffer.isDirty,
				)
			)
				return {
					ok: false,
					message: "Save the current document before refiling or archiving a subtree.",
				}
			if (
				!archive &&
				"targetRelativePath" in result &&
				typeof result.targetRelativePath === "string"
			) {
				const targetPath = result.targetRelativePath
				const abort = core.beginRead(lease)
				if (!abort)
					return { ok: false, message: "The originating command or buffer is no longer active." }
				const isActive = () => {
					const live = runtimeRef.current
					return (
						!live.suspended &&
						core.current(lease) &&
						live.controller.workspace?.rootPath === current.workspace?.rootPath &&
						live.controller.workspace?.capabilityToken === current.workspace?.capabilityToken &&
						live.controller.workspaceSessionId === current.workspaceSessionId &&
						live.controller.activeBufferId === current.activeBufferId &&
						live.controller.activeDocument?.relativePath === origin.relativePath &&
						live.controller.content === origin.content &&
						targetRef.current === _target
					)
				}
				lookupRef.current = { abort, lease, isActive }
				try {
					const lookup = await current.readRefileTarget(targetPath, abort.signal)
					if (abort.signal.aborted || !isActive())
						return { ok: false, message: "The originating command or buffer is no longer active." }
					if (lookup.kind === "rejected") return { ok: false, message: lookup.message }
					// Own immutable DTOs, never a mutable controller cache or user-entered offset.
					const snapshot = Object.freeze({
						...lookup.snapshot,
						headings: Object.freeze(
							lookup.snapshot.headings.map((heading) => Object.freeze({ ...heading })),
						),
					})
					const candidates = orgRefileTargetCandidates(snapshot, true)
					core.endRead(lease, abort)
					lookupRef.current = null
					launch(
						{
							prompt: "Refile under heading:",
							historyKey: "org.subtree.refile.heading",
							completion: "value",
							acceptCandidate: true,
							cancelWhileAccepting: false,
						},
						() => ({
							kind: "ready",
							context: origin,
							initialInput: RootCandidateLabel,
							candidates: candidates.map((candidate) => candidate.label),
						}),
						cursor,
						async (headingOrigin, live, _editor, retire, label) => {
							const candidate = candidates.find((candidate) => candidate.label === label)
							if (!candidate)
								return {
									ok: false,
									message: "Choose an exact target heading from the completion list.",
								}
							if (
								live.isDirty ||
								live.openBuffers?.some(
									(buffer) =>
										buffer.bufferId === live.activeBufferId &&
										(buffer.isDirty || buffer.hasConflict),
								)
							)
								return {
									ok: false,
									message: "Save the current document before refiling or archiving a subtree.",
								}
							try {
								const outcome = await live.refileSubtree(headingOrigin.cursor, targetPath, {
									expectedTargetRevision: snapshot.revision,
									...(candidate.kind === "heading"
										? {
												targetHeading: {
													from: candidate.target.from,
													heading: candidate.target.heading,
												},
											}
										: {}),
								})
								retire(
									outcome.message ??
										(outcome.kind === "success"
											? "Subtree refiled"
											: "Transfer failed. Review the target and reopen refile for a fresh selection."),
									outcome.kind !== "success" || Boolean(outcome.message),
								)
								return outcome.kind === "success"
									? { ok: true }
									: { ok: false, message: outcome.message }
							} catch {
								const message =
									"Transfer ended without a confirmed result; files may have changed. Reread both documents before reconciling them. Do not automatically retry; no rollback was attempted."
								retire(message, true)
								return { ok: false, message }
							}
						},
						lease,
					)
					return { ok: true }
				} catch {
					return {
						ok: false,
						message: "Could not read the target. Review the file path and try again.",
					}
				} finally {
					core.endRead(lease, abort)
					if (lookupRef.current?.abort === abort) lookupRef.current = null
				}
			}
			try {
				const outcome =
					"targetRelativePath" in result && typeof result.targetRelativePath === "string"
						? await current.refileSubtree(origin.cursor, result.targetRelativePath)
						: await current.archiveSubtree(origin.cursor)
				// Once filesystem effects began, retire the prompt even on failure; never retry blindly.
				finish(
					outcome.message ??
						(outcome.kind === "success"
							? archive
								? "Subtree archived"
								: "Subtree refiled"
							: "Transfer failed. Reread both documents before retrying."),
					outcome.kind !== "success" || Boolean(outcome.message),
				)
				return outcome.kind === "success" ? { ok: true } : { ok: false, message: outcome.message }
			} catch {
				const message =
					"Transfer ended without a confirmed result; files may have changed. Reread both documents before reconciling them. Do not automatically retry; no rollback was attempted."
				finish(message, true)
				return { ok: false, message }
			}
		})
	}
	const clearSparseTree = () => {
		const current = runtimeRef.current
		const target = targetRef.current
		if (
			!current.controller.activeDocument ||
			!target ||
			current.isBusy ||
			current.controller.isSaving ||
			current.controller.isLoading ||
			current.suspended ||
			core.busy()
		)
			return
		const lease = core.getSnapshot().lease
		const before = globalThis.document?.activeElement
		const host = before?.closest("[data-org-parameter-session]")
		const ownsFocus = Boolean(
			lease && host?.getAttribute("data-org-parameter-session") === String(lease.id),
		)
		if (!target.applyView?.(current.controller.content, { kind: "sparse-tree", query: null })) {
			setEcho("This editor cannot clear the view, or the buffer changed. Cancel and retry.")
			return
		}
		if (!core.isAttached() || targetRef.current !== target || core.getSnapshot().lease !== lease)
			return
		const currentFocus = globalThis.document?.activeElement
		const stillOwned =
			ownsFocus &&
			host?.isConnected &&
			host.getAttribute("data-org-parameter-session") === String(lease?.id) &&
			host.contains(currentFocus ?? null) &&
			core.getSnapshot().lease === lease
		if (lease) core.retire(lease)
		persistentEchoRef.current = false
		setEcho("Sparse tree cleared")
		if (
			stillOwned &&
			core.isAttached() &&
			targetRef.current === target &&
			(globalThis.document?.activeElement === currentFocus ||
				(currentFocus &&
					!currentFocus.isConnected &&
					globalThis.document?.activeElement === globalThis.document?.body))
		)
			target.restoreFocus()
	}
	return {
		session,
		echo,
		open,
		clearSparseTree,
		openRefile: (cursor: number) => openTransfer(false, cursor),
		openArchive: (cursor: number) => openTransfer(true, cursor),
	}
}
