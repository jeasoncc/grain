import { useEffect, useRef, useState, type RefObject } from "react"
import { executeOrgTagsCommand, prepareOrgTagsCommand } from "@/flows/org-command/org-tags.command"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import type { OrgWorkspaceController } from "./use-org-workspace"

/** Orchestrates parameter collection and buffer commit; never writes files directly. */
export const useOrgTagsMinibuffer = (
	controller: OrgWorkspaceController,
	isBusy: boolean,
	targetRef: RefObject<OrgEditorCommandTarget | null>,
) => {
	const [session, setSession] = useState<OrgMinibufferSession | null>(null)
	const [echo, setEcho] = useState<string | null>(null)
	const sessionIdRef = useRef(0)
	const runtimeRef = useRef({ controller, isBusy })
	runtimeRef.current = { controller, isBusy }

	useEffect(() => {
		setSession(null)
	}, [controller.workspace?.rootPath, controller.activeDocument?.relativePath])
	useEffect(() => {
		if (!echo) return
		const timer = window.setTimeout(() => setEcho(null), 3500)
		return () => window.clearTimeout(timer)
	}, [echo])

	const open = (cursor: number) => {
		const document = controller.activeDocument
		const target = targetRef.current
		if (!document || !target || isBusy) return
		const prepared = prepareOrgTagsCommand({
			relativePath: document.relativePath,
			content: controller.content,
			cursor,
		})
		if (prepared.kind === "rejected") {
			setEcho(prepared.message)
			return
		}
		setEcho(null)
		const finish = (message: string) => {
			setSession(null)
			setEcho(message)
			if (targetRef.current === target) target.restoreFocus()
		}
		setSession({
			id: ++sessionIdRef.current,
			prompt: "Tags:",
			initialInput: prepared.initialInput,
			candidates: prepared.candidates,
			onCancel: () => finish("Canceled"),
			onAccept: (input) => {
				const current = runtimeRef.current
				if (current.isBusy)
					return {
						ok: false,
						message: "The buffer is saving or loading. Try again when it finishes.",
					}
				if (targetRef.current !== target)
					return { ok: false, message: "The originating buffer is no longer active." }
				const result = executeOrgTagsCommand(
					prepared.context,
					{
						relativePath: current.controller.activeDocument?.relativePath ?? "",
						content: current.controller.content,
						cursor,
					},
					input,
				)
				if (result.kind === "rejected") return { ok: false, message: result.message }
				if (result.kind === "edit" && !target.applyEdit(prepared.context.content, result.edit)) {
					return {
						ok: false,
						message: "The buffer changed before the command could be applied. Cancel and retry.",
					}
				}
				finish(result.kind === "no-change" ? "Tags unchanged" : "Tags updated")
				return { ok: true }
			},
		})
	}
	return { session, echo, open }
}
