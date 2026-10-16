import { Button } from "@/views/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/views/ui/dialog"

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
