import { useEffect, useId, useState } from "react"
import { Button } from "@/views/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/views/ui/dialog"
import { Input } from "@/views/ui/input"

export interface OrgInputDialogProps {
	readonly confirmLabel: string
	readonly defaultValue: string
	readonly description: string
	readonly inputLabel: string
	readonly open: boolean
	readonly title: string
	readonly onOpenChange: (open: boolean) => void
	readonly onSubmit: (value: string) => void
}

export const OrgInputDialog = ({
	confirmLabel,
	defaultValue,
	description,
	inputLabel,
	open,
	title,
	onOpenChange,
	onSubmit,
}: OrgInputDialogProps) => {
	const [value, setValue] = useState(defaultValue)
	const inputId = useId()

	useEffect(() => {
		if (open) {
			setValue(defaultValue)
		}
	}, [defaultValue, open])

	const submit = () => {
		const normalized = value.trim()
		if (!normalized) {
			return
		}
		onSubmit(normalized)
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form
					onSubmit={(event) => {
						event.preventDefault()
						submit()
					}}
				>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<label htmlFor={inputId} className="mt-4 block space-y-2 text-sm">
						<span className="font-medium">{inputLabel}</span>
						<Input
							id={inputId}
							autoFocus
							value={value}
							onChange={(event) => setValue(event.target.value)}
						/>
					</label>
					<DialogFooter className="mt-6">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!value.trim()}>
							{confirmLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export interface OrgCaptureDialogProps {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly onSubmit: (title: string, targetPath: string) => void
}

export const OrgCaptureDialog = ({ open, onOpenChange, onSubmit }: OrgCaptureDialogProps) => {
	const titleId = useId()
	const targetId = useId()
	const [title, setTitle] = useState("")
	const [targetPath, setTargetPath] = useState("inbox.org")

	useEffect(() => {
		if (open) {
			setTitle("")
			setTargetPath("inbox.org")
		}
	}, [open])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form
					onSubmit={(event) => {
						event.preventDefault()
						const normalizedTitle = title.trim()
						if (!normalizedTitle) {
							return
						}
						onSubmit(normalizedTitle, targetPath.trim() || "inbox.org")
						onOpenChange(false)
					}}
				>
					<DialogHeader>
						<DialogTitle>Capture TODO</DialogTitle>
						<DialogDescription>
							Add a TODO heading without leaving the current document.
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 space-y-4">
						<label htmlFor={titleId} className="block space-y-2 text-sm">
							<span className="font-medium">Title</span>
							<Input
								id={titleId}
								autoFocus
								value={title}
								onChange={(event) => setTitle(event.target.value)}
							/>
						</label>
						<label htmlFor={targetId} className="block space-y-2 text-sm">
							<span className="font-medium">Target Org file</span>
							<Input
								id={targetId}
								value={targetPath}
								onChange={(event) => setTargetPath(event.target.value)}
							/>
						</label>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!title.trim()}>
							Capture
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export interface OrgConfirmDialogProps {
	readonly confirmLabel: string
	readonly description: string
	readonly destructive?: boolean
	readonly open: boolean
	readonly title: string
	readonly onConfirm: () => void
	readonly onOpenChange: (open: boolean) => void
}

export const OrgConfirmDialog = ({
	confirmLabel,
	description,
	destructive = false,
	open,
	title,
	onConfirm,
	onOpenChange,
}: OrgConfirmDialogProps) => (
	<Dialog open={open} onOpenChange={onOpenChange}>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
					Cancel
				</Button>
				<Button
					type="button"
					variant={destructive ? "destructive" : "default"}
					onClick={() => {
						onConfirm()
						onOpenChange(false)
					}}
				>
					{confirmLabel}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
)
