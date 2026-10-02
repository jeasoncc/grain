import { useMemo } from "react"
import type { OrgOpenBufferSummary } from "@/hooks/use-org-workspace"
import { OrgNavigationPicker } from "./org-navigation-picker.view.fn"

export interface OrgBufferSwitchProps {
	readonly buffers: readonly OrgOpenBufferSummary[]
	readonly activeBufferId: string | null
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly sessionKey: string
	readonly onSelect: (
		buffer: OrgOpenBufferSummary,
		signal?: AbortSignal,
	) => boolean | Promise<boolean>
}

/** Buffer summaries are authoritative, including unsaved buffers whose files no longer exist. */
export const OrgBufferSwitch = ({ buffers, activeBufferId, ...props }: OrgBufferSwitchProps) => {
	const candidates = useMemo(
		() =>
			[
				...buffers.filter((buffer) => buffer.bufferId !== activeBufferId),
				...buffers.filter((buffer) => buffer.bufferId === activeBufferId),
			].map((buffer) => ({
				id: buffer.bufferId,
				relativePath: buffer.relativePath,
				value: buffer,
				optionLabel: `${buffer.relativePath}${buffer.isDirty ? " · Unsaved" : ""}${buffer.hasConflict ? " · External conflict" : ""}${buffer.bufferId === activeBufferId ? " · Current" : ""}`,
				markers: [
					buffer.isDirty ? "Unsaved" : "",
					buffer.hasConflict ? "External conflict" : "",
					buffer.bufferId === activeBufferId ? "Current" : "",
				]
					.filter(Boolean)
					.join(" · "),
			})),
		[buffers, activeBufferId],
	)
	return (
		<OrgNavigationPicker
			{...props}
			candidates={candidates}
			label="Buffer Switch"
			inputLabel="Search open buffers"
			placeholder="Switch buffer…"
			emptyMessage="No matching buffers."
			errorMessage="Could not switch buffer."
		/>
	)
}
