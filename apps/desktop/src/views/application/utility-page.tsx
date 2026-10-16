import { Link } from "@tanstack/react-router"
import { useId, type ReactNode } from "react"
import { Label } from "@/views/ui/label"

export function UtilityPage({ title, description, children }: {
	readonly title: string
	readonly description?: ReactNode
	readonly children: ReactNode
}) {
	return <main className="h-full min-w-0 overflow-y-auto bg-background">
		<div className="mx-auto w-full max-w-[54rem] space-y-7 px-6 py-5">
			<Link to="/org" className="inline-flex text-sm text-muted-foreground hover:text-foreground">Back to Source</Link>
			<header className="space-y-1">
				<h1 className="text-xl font-semibold">{title}</h1>
				{description && <p className="text-sm text-muted-foreground">{description}</p>}
			</header>
			{children}
		</div>
	</main>
}

export function UtilitySection({ title, description, children }: {
	readonly title: string
	readonly description?: ReactNode
	readonly children: ReactNode
}) {
	const titleId = useId()
	return <section aria-labelledby={titleId} className="min-w-0 space-y-4 border-t border-border/40 pt-5">
		<div className="space-y-1">
			<h2 id={titleId} className="text-base font-medium">{title}</h2>
			{description && <p className="text-sm text-muted-foreground">{description}</p>}
		</div>
		{children}
	</section>
}

export function UtilityRow({ label, description, controlId, children }: {
	readonly label: ReactNode
	readonly description?: ReactNode
	readonly controlId?: string
	readonly children: ReactNode
}) {
	return <div className="grid min-w-0 gap-3 sm:grid-cols-2">
		<div className="min-w-0 space-y-1">
			{controlId
				? <Label id={`${controlId}-label`} htmlFor={controlId} className="text-sm font-medium">{label}</Label>
				: <div className="text-sm font-medium">{label}</div>}
			{description && <p id={controlId ? `${controlId}-help` : undefined} className="text-sm text-muted-foreground">{description}</p>}
		</div>
		<div className="min-w-0">{children}</div>
	</div>
}
