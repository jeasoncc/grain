import { getTauriVersion, getVersion } from "@tauri-apps/api/app"
import { isTauri } from "@tauri-apps/api/core"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { version as interfaceVersion } from "../../package.json"
import { UtilityRow, UtilityPage, UtilitySection } from "@/views/application/utility-page"

export const Route = createFileRoute("/about")({
	component: AboutPage,
})

type NativeMetadata =
	| { readonly status: "loading" }
	| { readonly status: "available"; readonly appVersion: string; readonly tauriVersion: string }
	| { readonly status: "error"; readonly message: string }
	| { readonly status: "unavailable" }

function AboutPage() {
	const [native] = useState(() => isTauri())
	const [metadata, setMetadata] = useState<NativeMetadata>(() => ({ status: native ? "loading" : "unavailable" }))

	useEffect(() => {
		if (!native) return
		let active = true
		Promise.all([getVersion(), getTauriVersion()]).then(
			([appVersion, tauriVersion]) => {
				if (active) setMetadata({ status: "available", appVersion, tauriVersion })
			},
			(error: unknown) => {
				if (active) setMetadata({ status: "error", message: error instanceof Error ? error.message : String(error) })
			},
		)
		return () => { active = false }
	}, [native])

	return (
		<UtilityPage title="About Grain" description="An Org Source-first workspace. Build metadata and runtime information are shown separately.">
			<UtilitySection title="Build and runtime">
				<UtilityRow label="Interface build version" description="Version from the desktop interface package metadata included in this build.">
					<span className="break-all font-mono">{interfaceVersion}</span>
				</UtilityRow>
				<UtilityRow label="Interface build mode">
					<span>{import.meta.env.MODE}</span>
				</UtilityRow>
				<UtilityRow label="Environment">
					<span>{native ? "Tauri desktop runtime" : "Browser (no native desktop runtime)"}</span>
				</UtilityRow>
				{metadata.status === "available" && <>
					<UtilityRow label="Running application version" description="Reported by the native application API.">
						<span className="break-all font-mono">{metadata.appVersion}</span>
					</UtilityRow>
					<UtilityRow label="Tauri runtime version">
						<span className="break-all font-mono">{metadata.tauriVersion}</span>
					</UtilityRow>
				</>}
				{metadata.status === "loading" && <p role="status" className="text-sm text-muted-foreground">Reading native application metadata…</p>}
				{metadata.status === "unavailable" && <p className="text-sm text-muted-foreground">Running application and Tauri versions are unavailable outside the native desktop runtime.</p>}
				{metadata.status === "error" && <p role="alert" className="break-words">Native application metadata is unavailable: {metadata.message}</p>}
			</UtilitySection>
			<UtilitySection title="Reported platform" description="These values come from the browser or embedded webview. They are not a verified operating-system version or CPU architecture.">
				<UtilityRow label="Browser-reported platform">
					<span className="break-all">{navigator.platform || "Unavailable: the browser did not report a platform."}</span>
				</UtilityRow>
				<UtilityRow label="Browser / webview user agent">
					<span className="break-all">{navigator.userAgent || "Unavailable: the browser did not report a user agent."}</span>
				</UtilityRow>
			</UtilitySection>
		</UtilityPage>
	)
}
