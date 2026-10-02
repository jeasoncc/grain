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
	readonly allowEmpty?: boolean
	readonly confirmLabel: string
	readonly defaultValue: string
	readonly description: string
	readonly inputLabel: string
	readonly invalidMessage?: string
	readonly open: boolean
	readonly title: string
	readonly onOpenChange: (open: boolean) => void
	readonly onSubmit: (value: string) => boolean | void
}

export const OrgInputDialog = ({
	allowEmpty = false,
	confirmLabel,
	defaultValue,
	description,
	inputLabel,
	invalidMessage = "Check the value and try again.",
	open,
	title,
	onOpenChange,
	onSubmit,
}: OrgInputDialogProps) => {
	const [value, setValue] = useState(defaultValue)
	const [submitRejected, setSubmitRejected] = useState(false)
	const inputId = useId()

	useEffect(() => {
		if (open) {
			setValue(defaultValue)
			setSubmitRejected(false)
		}
	}, [defaultValue, open])

	const submit = () => {
		const normalized = value.trim()
		if (!allowEmpty && !normalized) {
			return
		}
		const accepted = onSubmit(normalized)
		if (accepted === false) {
			setSubmitRejected(true)
			return
		}
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
							aria-invalid={submitRejected}
							onChange={(event) => {
								setValue(event.target.value)
								setSubmitRejected(false)
							}}
						/>
					</label>
					{submitRejected && (
						<p role="alert" className="mt-2 text-xs text-destructive">
							{invalidMessage}
						</p>
					)}
					<DialogFooter className="mt-6">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!allowEmpty && !value.trim()}>
							{confirmLabel}
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
