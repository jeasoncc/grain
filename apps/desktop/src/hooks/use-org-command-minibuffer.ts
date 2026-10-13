import * as E from "fp-ts/Either"
import type { RefObject } from "react"
import { useLayoutEffect, useRef } from "react"
import { useSettings } from "./use-settings"
import { useOrgSourceParameters } from "./use-org-source-parameters"
import { captureOrgCalendarContext, systemOrgNow } from "@/utils/org-date-clock"
import { parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import { configuredOrgRefileTargetCandidates, planOrgRefilePreview } from "@/pipes/org/org-refile-preview.pipe"
import type { OrgBufferCommandContext } from "@/flows/org-command/org-buffer-command"
import { executeOrgArchiveCommand, executeOrgRefileCommand, prepareOrgArchiveCommand, prepareOrgRefileCommand } from "@/flows/org-command/org-refile.command"
import { createOrgRefileTargetSnapshot, type OrgRefileTargetSnapshot } from "@/pipes/org/org-refile-target.pipe"
import { extractOrgSubtreeAt, planOrgRefilePayload, type OrgRefileLoggingIntent } from "@/pipes/org/org-subtree-refile.pipe"
import { parseOrgSparseTreeQuery, type OrgSparseTreeNativeContext } from "@/pipes/org/org-sparse-tree.pipe"
import { prepareOrgSparseTreeContext } from "@/flows/org-command/org-sparse-tree-context"
import type { OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { OrgWorkspaceController } from "./use-org-workspace"

/** Shared parameter ownership; pure buffer transactions and explicit transfer effects remain distinct. */
export const useOrgCommandMinibuffer = (
	controller: OrgWorkspaceController,
	isBusy: boolean,
	targetRef: RefObject<OrgEditorCommandTarget | null>,
	suspended = false,
	now: () => Date = systemOrgNow,
) => {
	const configurationGeneration = useRef({})
	useLayoutEffect(() => useSettings.subscribe((state, previous) => {
		if (state.orgBehaviorConfigurationJson !== previous.orgBehaviorConfigurationJson)
			configurationGeneration.current = {}
	}), [])
	const source = useOrgSourceParameters({
		current: controller, isBusy, suspended, now, preserveSelection: true,
		captureClockContext: controller.clock.captureSparseContext,
		scope: [controller.workspace?.rootPath, controller.workspace?.capabilityToken,
			controller.workspaceSessionId, controller.activeBufferId, controller.activeDocument?.relativePath],
		readSource: (current) => current.activeDocument ? {
			relativePath: current.activeDocument.relativePath, content: current.content,
			filename: current.workspace ? `${current.workspace.rootPath.replace(/[\\/]+$/, "")}/${current.activeDocument.relativePath}` : null,
			savingOrLoading: current.isSaving || current.isLoading,
		} : null,
	}, targetRef)
	const { launch, core, lookupRef } = source
	const openTransfer = (archive: boolean, cursor: number) => {
		const generation = configurationGeneration.current
		const calendar = captureOrgCalendarContext(now)
		if (!archive && calendar.kind === "error") {
			source.reportRejected(calendar.message)
			return
		}
		const parsedConfiguration = parseOrgBehaviorConfiguration(useSettings.getState().orgBehaviorConfigurationJson)
		if (!archive && E.isLeft(parsedConfiguration)) {
			source.reportRejected(parsedConfiguration.left.message)
			return
		}
		if (archive && controller.isDirty) {
			source.reportRejected("Save the current document before refiling or archiving a subtree.")
			return
		}
		const prepare = archive ? prepareOrgArchiveCommand : (context: OrgBufferCommandContext) => {
			const configuration = E.isRight(parsedConfiguration) ? parsedConfiguration.right : null
			if (!configuration) return { kind: "rejected" as const, reason: "invalid-path" as const, message: "Invalid Org behavior configuration." }
			const prepared = prepareOrgRefileCommand(context, configuration.refile.files ??
				controller.workspace?.documents.map((document) => document.relativePath) ?? [])
			if (prepared.kind === "rejected" || configuration.refile.files === null) return prepared
			// An explicit file allowlist governs completion AND typed input, including same-file moves.
			const candidates = prepared.candidates.filter((path) => configuration.refile.files!.includes(path))
			return { ...prepared, candidates, initialInput: candidates.includes(prepared.initialInput) ? prepared.initialInput : candidates[0] ?? "" }
		}
		launch({
			historyKey: archive ? "org.subtree.archive" : "org.subtree.refile",
			prompt: archive ? "Archive subtree (yes/no):" : "Refile to Org file:",
			completion: "value",
			cancelWhileAccepting: !archive,
		}, prepare, cursor, async (origin, current, _target, finish, input, lease, isCurrent) => {
			if (current.openBuffers?.some((buffer) => buffer.bufferId === current.activeBufferId && (buffer.hasConflict || buffer.autosavePaused)))
				return { ok: false, message: "Resolve the current buffer conflict before refiling or archiving." }
			const currentContext = { relativePath: current.activeDocument?.relativePath ?? "", content: current.content, cursor }
			if (archive) {
				if (current.isDirty || current.openBuffers?.some((buffer) => buffer.bufferId === current.activeBufferId && buffer.isDirty))
					return { ok: false, message: "Save the current document before archiving a subtree." }
				const result = executeOrgArchiveCommand(origin, currentContext, input)
				if (result.kind === "rejected") return { ok: false, message: result.message }
				if (result.kind === "cancel") { finish({ kind: "cancelled", message: "Canceled" }); return { ok: true } }
				try {
					const outcome = await current.archiveSubtree(origin.cursor)
					finish({ kind: outcome.kind === "success" ? "success" : "rejected",
						message: outcome.message ?? (outcome.kind === "success" ? "Subtree archived" : "Transfer failed. Reread both documents before retrying.") },
					outcome.kind !== "success" || Boolean(outcome.message))
					return outcome.kind === "success" ? { ok: true } : { ok: false, message: outcome.message }
				} catch {
					const message = "Transfer ended without a confirmed result; files may have changed. Reread both documents before reconciling them. Do not automatically retry; no rollback was attempted."
					finish({ kind: "rejected", message }, true)
					return { ok: false, message }
				}
			}
			const configuration = E.isRight(parsedConfiguration) ? parsedConfiguration.right : null
			if (!configuration) return { ok: false, message: "Invalid Org behavior configuration." }
			const result = executeOrgRefileCommand(origin, currentContext, input)
			if (result.kind === "rejected") return { ok: false, message: result.message }
			const targetPath = result.targetRelativePath
			if (configuration.refile.files !== null && !configuration.refile.files.includes(targetPath))
				return { ok: false, message: "Choose a target file allowed by the Org behavior configuration." }
			if (result.kind === "transfer" && (current.isDirty || current.openBuffers?.some((buffer) => buffer.bufferId === current.activeBufferId && buffer.isDirty)))
				return { ok: false, message: "Save the current document before refiling to another file." }
			const logging: OrgRefileLoggingIntent = Object.freeze({
				expectedSourceContent: origin.content,
				stamp: calendar.kind === "context" ? calendar.context.logStamp! : "",
				options: Object.freeze({ logging: configuration.logging, inheritance: configuration.inheritance }),
			})
			const payload = planOrgRefilePayload(origin.content, origin.cursor, logging)
			if (payload.kind === "rejected") return { ok: false, message: payload.message }
			const offerHeadings = (snapshot: OrgRefileTargetSnapshot, nativeContext: OrgSparseTreeNativeContext) => {
				const moved = extractOrgSubtreeAt(origin.content, origin.cursor)!
				const candidates = configuredOrgRefileTargetCandidates(snapshot, configuration, result.kind === "local" ? moved : undefined,
					calendar.kind === "context" ? { calendar: calendar.context, nativeContext } : undefined)
				if (candidates.length === 0) return { ok: false as const, message: "No legal Refile targets match the configured depth/filter rules." }
				const read = lookupRef.current
				if (read?.lease === lease) {
					core.endRead(lease, read.abort)
					lookupRef.current = null
				}
				launch({
					prompt: "Refile under heading:",
					historyKey: "org.subtree.refile.heading",
					completion: "value",
					acceptCandidate: true,
				}, () => ({ kind: "ready", context: origin, initialInput: candidates[0].label, candidates: candidates.map((candidate) => candidate.label) }),
				cursor, (headingOrigin, live, _editor, _retire, label, headingLease, headingIsCurrent) => {
					if (live.openBuffers?.some((buffer) => buffer.bufferId === live.activeBufferId && (buffer.hasConflict || buffer.autosavePaused)))
						return { ok: false, message: "Resolve the current buffer conflict before refiling." }
					if (result.kind === "transfer" && (live.isDirty || live.openBuffers?.some((buffer) => buffer.bufferId === live.activeBufferId && buffer.isDirty)))
						return { ok: false, message: "Save the current document before refiling to another file." }
					const candidate = candidates.find((entry) => entry.label === label)
					if (!candidate) return { ok: false, message: "Choose an exact target heading from the completion list." }
					const plan = planOrgRefilePreview(headingOrigin, snapshot, candidate, payload.kind === "needs-note" ? undefined : logging)
					if (plan.kind === "rejected") return { ok: false, message: plan.message }
					if (!headingIsCurrent()) return { ok: false, message: "The originating command or buffer is no longer active." }
					launch({
						prompt: "Confirm Refile (yes/no):",
						historyKey: "org.subtree.refile.confirm",
						completion: "value",
						cancelWhileAccepting: false,
						preview: payload.kind === "needs-note" ? { ...plan.preview, detail: `${plan.preview.detail} The required Refile note is collected before any move or file effect.` } : plan.preview,
					}, () => ({ kind: "ready", context: headingOrigin, initialInput: "no", candidates: ["no", "yes"] }),
					cursor, async (confirmedOrigin, live, editor, retire, answer, confirmLease, confirmIsCurrent, loggingCollector) => {
						const confirmation = answer.trim().toLowerCase()
						if (confirmation === "no") { retire({ kind: "cancelled", message: "Canceled" }); return { ok: true } }
						if (confirmation !== "yes") return { ok: false, message: "Type yes to refile, or no to cancel." }
						if (live.openBuffers?.some((buffer) => buffer.bufferId === live.activeBufferId && (buffer.hasConflict || buffer.autosavePaused)))
							return { ok: false, message: "Resolve the current buffer conflict before refiling." }
						let transferMessage: string | undefined
						const executeMove = async (intent: OrgRefileLoggingIntent, valid: () => boolean): Promise<OrgTodoNoteResult> => {
							if (!valid() || configurationGeneration.current !== generation)
								return { kind: "rejected", reason: "stale-refile-request" }
							const reviewed = planOrgRefilePreview(confirmedOrigin, snapshot, candidate, intent)
							if (reviewed.kind === "rejected") return { kind: "rejected", reason: reviewed.message }
							if (reviewed.kind === "local") {
								const revision = editor.getCommandContext().revision
								try {
									if (!editor.applyEdits?.(confirmedOrigin.content, reviewed.batch))
										return { kind: "rejected", reason: "The originating editor cannot apply this atomic move." }
								} catch {
									let expected = confirmedOrigin.content
									for (const edit of [...reviewed.batch.changes].reverse())
										expected = expected.slice(0, edit.from) + edit.insert + expected.slice(edit.to)
									const accepted = editor.getCommandContext()
									if (accepted.content !== expected || accepted.revision <= revision)
										return { kind: "rejected", reason: "Canonical Source did not confirm this atomic move." }
								}
								return { kind: "applied" }
							}
							const current = source.runtimeRef.current.current
							if (current.isDirty || current.openBuffers?.some((buffer) => buffer.bufferId === current.activeBufferId && (buffer.isDirty || buffer.hasConflict || buffer.autosavePaused)))
								return { kind: "rejected", reason: "Save or reconcile the current document before refiling to another file." }
							try {
								const outcome = await current.refileSubtree(confirmedOrigin.cursor, reviewed.target.relativePath, {
									snapshot: reviewed.target,
									...(reviewed.candidate.kind === "heading" ? { targetHeading: { from: reviewed.candidate.target.from, heading: reviewed.candidate.target.heading } } : {}),
									...(payload.kind !== "ready" || payload.payload !== payload.moved.text ? { logging: intent } : {}),
								})
								// A settled file attempt is never left as a retryable note capability.
								if (outcome.kind !== "success") {
									transferMessage = outcome.message ?? "Transfer failed. Reread both documents before reconciling them."
									source.reportRejected(transferMessage)
									return { kind: "aborted" }
								}
								transferMessage = outcome.message
								if (transferMessage) source.reportRejected(transferMessage)
								return { kind: "applied" }
							} catch {
								transferMessage = "Transfer ended without a confirmed result; files may have changed. Reread both documents before reconciling them. Do not automatically retry; no rollback was attempted."
								source.reportRejected(transferMessage)
								return { kind: "aborted" }
							}
						}
						if (payload.kind === "needs-note") {
							const accepted = loggingCollector?.(confirmedOrigin.content, "Refile note",
								(note, noteIsCurrent) => executeMove(Object.freeze({ ...logging, note }), noteIsCurrent),
								plan.kind === "transfer" ? "Subtree transferred to the confirmed file snapshots. Review any retained-input warnings before saving." : undefined) ?? false
							if (!accepted) return { ok: false, message: "This Source window cannot collect the required Refile note." }
							core.retire(confirmLease)
							return { ok: true }
						}
						const outcome = await executeMove(logging, confirmIsCurrent)
						if (outcome.kind === "rejected") return { ok: false, message: outcome.reason }
						const message = transferMessage ?? (outcome.kind === "applied"
							? plan.kind === "local" && plan.unchanged ? "Subtree already in place" : "Subtree refiled"
							: "Transfer failed. Reread both documents before reconciling them.")
						retire({ kind: outcome.kind === "applied" ? "success" : "rejected", message }, outcome.kind !== "applied" || Boolean(transferMessage))
						return outcome.kind === "applied" ? { ok: true } : { ok: false, message }
					}, headingLease)
					return { ok: true }
				}, lease)
				return { ok: true as const }
			}
			const prepareHeadings = (snapshot: OrgRefileTargetSnapshot, signal?: AbortSignal) => {
				if (configuration.refile.match === null) return offerHeadings(snapshot, Object.freeze({}))
				const match = configuration.refile.match.trim()
				const query = parseOrgSparseTreeQuery(match.startsWith("match:") ? match : `match:${match}`, configuration.inheritance)
				if (!query) return { ok: false as const, message: "Invalid configured Refile match expression." }
				const filename = current.workspace ? `${current.workspace.rootPath.replace(/[\\/]+$/, "")}/${snapshot.relativePath}` : null
				const context = prepareOrgSparseTreeContext(snapshot.source, query, filename, signal,
					current.clock.captureSparseContext(snapshot.source, filename))
				const publish = (nativeContext: OrgSparseTreeNativeContext) => {
					if (signal?.aborted || !isCurrent()) return { ok: false as const, message: "The originating command or buffer is no longer active." }
					return offerHeadings(snapshot, nativeContext)
				}
				return context instanceof Promise ? context.then(publish) : publish(context)
			}
			if (result.kind === "local" && configuration.refile.match === null)
				return prepareHeadings(createOrgRefileTargetSnapshot(origin.relativePath, "", origin.content))
			const abort = core.beginRead(lease)
			if (!abort) return { ok: false, message: "The originating command or buffer is no longer active." }
			const isActive = () => isCurrent() && source.runtimeRef.current.current.content === origin.content
			lookupRef.current = { abort, lease, isActive }
			try {
				const lookup = result.kind === "local"
					? { kind: "ready" as const, snapshot: createOrgRefileTargetSnapshot(origin.relativePath, "", origin.content) }
					: await current.readRefileTarget(targetPath, abort.signal)
				if (abort.signal.aborted || !isActive()) return { ok: false, message: "The originating command or buffer is no longer active." }
				if (lookup.kind === "rejected") return { ok: false, message: lookup.message }
				if (lookup.snapshot.relativePath !== targetPath || typeof lookup.snapshot.source !== "string")
					return { ok: false, message: "Target lookup did not retain exact requested source provenance." }
				if (configuration.refile.files !== null && lookup.snapshot.revision === "<missing>")
					return { ok: false, message: "Configured Refile targets must be existing Org files. Create the target separately, then reopen Refile." }
				// Context capture stays inside the same read lease as target IO, including dirty local Source.
				return await prepareHeadings(lookup.snapshot, abort.signal)
			} catch (cause) {
				return { ok: false, message: abort.signal.aborted || !isActive()
					? "The originating command or buffer is no longer active."
					: `Cannot prepare Refile targets: ${cause instanceof Error ? cause.message : String(cause)}` }
			} finally {
				core.endRead(lease, abort)
				if (lookupRef.current?.abort === abort) lookupRef.current = null
			}
		})
	}
	return {
		reportRejected: source.reportRejected,
		session: source.session,
		result: source.result,
		open: source.open,
		clearSparseTree: source.clearSparseTree,
		openRefile: (cursor: number) => openTransfer(false, cursor),
		openArchive: (cursor: number) => openTransfer(true, cursor),
	}
}
