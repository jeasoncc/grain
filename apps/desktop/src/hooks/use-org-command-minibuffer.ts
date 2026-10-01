import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
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
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgWorkspaceController } from "./use-org-workspace"

type ParameterDescription = Pick<
	OrgMinibufferSession,
	"prompt" | "historyKey" | "completion" | "cancelWhileAccepting"
>
type ParameterCommit = (
	origin: OrgBufferCommandContext,
	current: OrgWorkspaceController,
	target: OrgEditorCommandTarget,
	finish: (message: string, persistent?: boolean) => void,
	input: string,
) => OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>

/** Shared parameter ownership; pure buffer transactions and explicit transfer effects remain distinct. */
export const useOrgCommandMinibuffer = (
	controller: OrgWorkspaceController,
	isBusy: boolean,
	targetRef: RefObject<OrgEditorCommandTarget | null>,
	suspended = false,
) => {
	const [session, setSession] = useState<OrgMinibufferSession | null>(null)
	const [echo, setEcho] = useState<string | null>(null)
	const sessionIdRef = useRef(0)
	const committingRef = useRef(false)
	const persistentEchoRef = useRef(false)
	const runtimeRef = useRef({ controller, isBusy, suspended })
	runtimeRef.current = { controller, isBusy, suspended }
	useEffect(
		() => () => {
			++sessionIdRef.current
		},
		[],
	)
	useEffect(() => {
		++sessionIdRef.current
		setSession(null)
		setEcho(null)
	}, [controller.workspace?.rootPath, controller.activeDocument?.relativePath])
	useLayoutEffect(() => {
		if (!suspended) return
		++sessionIdRef.current
		setSession(null)
		setEcho(null)
	}, [suspended])
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
	) => {
		const document = controller.activeDocument
		const target = targetRef.current
		if (!document || !target || isBusy || suspended || committingRef.current) return
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
		const sessionId = ++sessionIdRef.current
		setEcho(null)
		const originIsActive = () =>
			!runtimeRef.current.suspended &&
			sessionIdRef.current === sessionId &&
			runtimeRef.current.controller.workspace?.rootPath === root &&
			runtimeRef.current.controller.activeDocument?.relativePath ===
				prepared.context.relativePath &&
			targetRef.current === target
		const finish = (message: string, persistent = false) => {
			if (!originIsActive()) return
			++sessionIdRef.current
			setSession(null)
			persistentEchoRef.current = persistent
			setEcho(message)
			target.restoreFocus()
		}
		setSession({
			...description,
			id: sessionId,
			initialInput: prepared.initialInput,
			candidates: prepared.candidates,
			onCancel: () => {
				if (!committingRef.current || description.cancelWhileAccepting !== false) finish("Canceled")
			},
			onAccept: (input) => {
				const current = runtimeRef.current
				if (!originIsActive())
					return { ok: false, message: "The originating command or buffer is no longer active." }
				if (current.isBusy || committingRef.current)
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
				if (description.cancelWhileAccepting !== false)
					return commit(prepared.context, current.controller, target, finish, input)
				committingRef.current = true
				try {
					return Promise.resolve(
						commit(prepared.context, current.controller, target, finish, input),
					).finally(() => {
						committingRef.current = false
					})
				} catch (error) {
					committingRef.current = false
					throw error
				}
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
				if (result.kind === "edit" && !target.applyEdit(origin.content, result.edit))
					return {
						ok: false,
						message: "The buffer changed before the command could be applied. Cancel and retry.",
					}
				finish(result.kind === "no-change" ? command.unchangedMessage : command.updatedMessage)
				return { ok: true }
			},
		)
	const openTransfer = (archive: boolean, cursor: number) => {
		if (controller.isDirty) {
			setEcho("Save the current document before refiling or archiving a subtree.")
			return
		}
		const description: ParameterDescription = {
			historyKey: archive ? "org.subtree.archive" : "org.subtree.refile",
			prompt: archive ? "Archive subtree (yes/no):" : "Refile to Org file:",
			completion: "value",
			cancelWhileAccepting: false,
		}
		const prepare = archive
			? prepareOrgArchiveCommand
			: (context: OrgBufferCommandContext) =>
					prepareOrgRefileCommand(
						context,
						controller.workspace?.documents.map((document) => document.relativePath) ?? [],
					)
		launch(description, prepare, cursor, async (origin, current, _target, finish, input) => {
			if (current.isDirty)
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
	return {
		session,
		echo,
		open,
		openRefile: (cursor: number) => openTransfer(false, cursor),
		openArchive: (cursor: number) => openTransfer(true, cursor),
	}
}
