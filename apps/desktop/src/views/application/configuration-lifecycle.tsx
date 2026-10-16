import { useEffect, useLayoutEffect } from "react"
import { startConfigurationSynchronization } from "@/flows/configuration/configuration.flow"
import { useConfigurationState } from "@/state/configuration.state"
import { toast } from "sonner"
import { useThemeInitialization } from "@/hooks/use-theme"
import { FontStyleInjector } from "../utils/font-style-injector"

/** Fixed-file authority, appearance and diagnostics for every renderer. */
export function ConfigurationLifecycle() {
	useThemeInitialization()
	const status = useConfigurationState(state => state.status)
	const error = useConfigurationState(state => state.error)
	const notice = useConfigurationState(state => state.notice)
	useEffect(() => { if (notice) toast.info(notice, { duration: 12000 }) }, [notice])
	useLayoutEffect(startConfigurationSynchronization, [])
	return <><FontStyleInjector />{status === "error" && error && <div role="alert" aria-label="Configuration error" className="shrink-0 border-b border-l-2 border-destructive/60 bg-destructive/10 px-3 py-2 text-xs">
		<p className="font-medium">Configuration was not applied</p>
		<pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono">{error}</pre>
		<p className="mt-1 text-muted-foreground">Fix the file, then run Reload configuration from the main window’s Commands. Previous visual preferences and document contents are retained.</p>
	</div>}</>
}
