import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import type { OrgBufferCommand } from "@/flows/org-command/org-buffer-command"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgWorkspaceController } from "./use-org-workspace"

/** One parameter session and transaction boundary shared by buffer-edit commands; no file IO. */
export const useOrgCommandMinibuffer = (
	controller: OrgWorkspaceController,
	isBusy: boolean,
	targetRef: RefObject<OrgEditorCommandTarget | null>,
	suspended = false,
) => {
	const [session, setSession] = useState<OrgMinibufferSession | null>(null)
	const [echo, setEcho] = useState<string | null>(null)
	const sessionIdRef = useRef(0)
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
		if (!echo) return
		const timer = window.setTimeout(() => setEcho(null), 3500)
		return () => window.clearTimeout(timer)
	}, [echo])

	const open = (command: OrgBufferCommand, cursor: number) => {
		const document = controller.activeDocument
		const target = targetRef.current
		if (!document || !target || isBusy || suspended) return
		const prepared = command.prepare({
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
		const finish = (message: string) => {
			if (!originIsActive()) return
			++sessionIdRef.current
			setSession(null)
			setEcho(message)
			target.restoreFocus()
		}
		setSession({
			id: sessionId,
			historyKey: command.id,
			completion: command.completion,
			prompt: command.prompt,
			initialInput: prepared.initialInput,
			candidates: prepared.candidates,
			onCancel: () => finish("Canceled"),
			onAccept: (input) => {
				const current = runtimeRef.current
				if (!originIsActive())
					return { ok: false, message: "The originating command or buffer is no longer active." }
				if (current.isBusy)
					return {
						ok: false,
						message: "The buffer is saving or loading. Try again when it finishes.",
					}
				const result = command.execute(
					prepared.context,
					{
						relativePath: current.controller.activeDocument?.relativePath ?? "",
						content: current.controller.content,
						cursor,
					},
					input,
				)
				if (result.kind === "rejected") return { ok: false, message: result.message }
				if (result.kind === "edit" && !target.applyEdit(prepared.context.content, result.edit))
					return {
						ok: false,
						message: "The buffer changed before the command could be applied. Cancel and retry.",
					}
				finish(result.kind === "no-change" ? command.unchangedMessage : command.updatedMessage)
				return { ok: true }
			},
		})
	}
	return { session, echo, open }
}
