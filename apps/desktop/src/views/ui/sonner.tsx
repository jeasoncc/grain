import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/hooks/use-theme"

const Toaster = ({ ...props }: ToasterProps) => {
	const { mode } = useTheme()

	return (
		<Sonner
			theme={mode as ToasterProps["theme"]}
			className="toaster group"
			position="bottom-right"
			toastOptions={{
				classNames: {
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium rounded-lg px-3 py-1.5 transition-colors hover:bg-primary/90",
					cancelButton:
						"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/80",
					description: "group-[.toast]:text-muted-foreground text-xs font-medium",
					error: "!border-2 !border-[var(--error)] !bg-[var(--toast-background)]",
					info: "!border-2 !border-[var(--info)] !bg-[var(--toast-background)]",
					success: "!border-2 !border-[var(--success)] !bg-[var(--toast-background)]",
					title: "group-[.toast]:font-semibold text-sm tracking-tight",
					toast:
						"group toast group-[.toaster]:bg-[var(--toast-background)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-[var(--toast-foreground)] group-[.toaster]:border-2 group-[.toaster]:border-[var(--toast-border)] group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:gap-3 group-[.toaster]:font-sans",
					warning: "!border-2 !border-[var(--warning)] !bg-[var(--toast-background)]",
				},
			}}
			icons={{
				error: <OctagonXIcon className="size-5 text-[var(--error)]" />,
				info: <InfoIcon className="size-5 text-[var(--info)]" />,
				loading: <Loader2Icon className="size-5 animate-spin text-muted-foreground" />,
				success: <CircleCheckIcon className="size-5 text-[var(--success)]" />,
				warning: <TriangleAlertIcon className="size-5 text-[var(--warning)]" />,
			}}
			{...props}
		/>
	)
}

export { Toaster }
