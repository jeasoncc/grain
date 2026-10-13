import * as E from "fp-ts/Either"
import { useEffect, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION, parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import { Button } from "@/views/ui/button"
import { Label } from "@/views/ui/label"
import { Textarea } from "@/views/ui/textarea"

export function OrgBehaviorSettings() {
	const savedJson = useSettings((state) => state.orgBehaviorConfigurationJson)
	const setSavedJson = useSettings((state) => state.setOrgBehaviorConfigurationJson)
	const [json, setJson] = useState(savedJson)
	const [storageError, setStorageError] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)
	useEffect(() => { setJson(savedJson) }, [savedJson])
	const configuration = parseOrgBehaviorConfiguration(json)
	const save = (raw: string) => {
		setStorageError(null)
		setStatus(null)
		if (E.isLeft(parseOrgBehaviorConfiguration(raw))) return
		try { setSavedJson(raw) } catch (error) {
			setStorageError(`Cannot save Org behavior configuration: ${error instanceof Error ? error.message : "storage unavailable"}. Saved behavior was not changed.`)
			return
		}
		setJson(raw)
		setStatus(raw.trim() ? "Org behavior configuration saved." : "Default Org behavior restored.")
	}
	return (
		<section aria-labelledby="org-behavior-settings-title" className="space-y-4">
			<div>
				<h3 id="org-behavior-settings-title" className="text-lg font-medium">Org behavior</h3>
				<p className="text-sm text-muted-foreground">Configure Refile targets, Sparse Tree inheritance, date prompt policies and logging preferences. Saving settings never writes Org files; changing behavior retires open readers and confirmations. Blank retains existing targets and tag inheritance, with property inheritance off.</p>
			</div>
			<form onSubmit={(event) => { event.preventDefault(); save(json) }} className="space-y-3">
				<Label htmlFor="org-behavior-configuration-json">Org behavior configuration JSON</Label>
				<Textarea id="org-behavior-configuration-json" value={json} onChange={(event) => { setJson(event.target.value); setStorageError(null); setStatus(null) }} rows={14} spellCheck={false} className="font-mono" aria-invalid={E.isLeft(configuration)} aria-describedby={`org-behavior-config-help${E.isLeft(configuration) ? " org-behavior-config-error" : ""}`} placeholder="Blank uses the built-in Org behavior" />
				{E.isLeft(configuration) && <p id="org-behavior-config-error" role="alert" className="text-sm text-destructive">{configuration.left.message}</p>}
				{storageError && <p role="alert" className="text-sm text-destructive">{storageError}</p>}
				{status && <p role="status" className="text-sm">{status}</p>}
				<div className="flex flex-wrap gap-2">
					<Button type="submit" disabled={E.isLeft(configuration)}>Save Org behavior configuration</Button>
					<Button type="button" variant="outline" onClick={() => save("")}>Restore Org behavior defaults</Button>
					<Button type="button" variant="outline" onClick={() => { setJson(JSON.stringify(DEFAULT_ORG_BEHAVIOR_CONFIGURATION, null, 2)); setStorageError(null); setStatus("Default JSON loaded for editing; changes are not saved yet.") }}>Load default Org behavior JSON for editing</Button>
				</div>
			</form>
			<div id="org-behavior-config-help" className="space-y-2 text-sm text-muted-foreground">
				<p>Use <code>version: 1</code>, <code>refile</code>, and <code>inheritance</code>, with optional closed <code>dateReader</code> and <code>logging</code> blocks. Refile requires <code>files</code> (null for workspace files, or unique relative .org paths), <code>maxDepth</code> (null or positive integer), <code>includeRoot</code> (boolean), and <code>match</code> (null or an Org match expression). Explicit files also restrict typed choices. Depth is the target parent level; filters select headings, while includeRoot independently permits file-root insertion.</p>
				<p>Inheritance requires <code>tags</code> and <code>properties</code> (boolean or unique name arrays), plus <code>tagExclusions</code> and <code>propertyExclusions</code> (name arrays). Exclusions prevent inheritance, not local matches. Property names are case-insensitive; tag names remain case-sensitive. Nearest local property wins. Legacy <code>tag:</code> always matches local tags; <code>itag:</code> and conventional matches use this inheritance policy.</p>
				<p>Date reader requires <code>preferFuture</code> (true, false, or "time") and <code>forceCompatibleYears</code> (boolean). Defaults prefer future incomplete dates and retain Gregorian years 1–9999. Compatible years forces prompt years into 1970–2037 with visible feedback; stored Source timestamps never acquire prompt defaults or forced years.</p>
				<p>Logging requires <code>done</code>, <code>repeat</code>, <code>reschedule</code>, <code>redeadline</code>, and <code>refile</code> ("none", "time", or "note"), plus <code>repeatToState</code> (false for normal sequence reset, true for the prior state, or a keyword). Ordinary done and operation logging default to none; repeat logging defaults to time. Unknown reset keywords fall back to normal sequence behavior.</p>
				<p>GNU tag/property examples: <code>match:+work-boss|home</code>, <code>{'match:work+EFFORT>=2|home+EFFORT>=2'}</code>, <code>{'match:OWNER="Ada"+DEADLINE<="<2026-10-09>"/!TODO|NEXT'}</code>. Operators: implicit +/− conjunction, &amp;/|; this grammar does not group terms with parentheses or NOT/AND/OR and retains GNU-compatible partial tails. Regex tags and property values use braces. Quoted values compare strings, unquoted numbers compare numerically, quoted Org dates compare calendars (today/now and day/week offsets supported). A slash introduces TODO-state matching; /! additionally requires a pending state.</p>
				<p>Explicit local predicates support parentheses and NOT/AND/OR, for example <code>{'match:(itag:work OR itag:home) AND EFFORT>=2'}</code>. The local todo, todo:STATE, tag:NAME, itag:NAME, text:LITERAL and quoted text forms remain accepted.</p>
				<p>Unknown fields, invalid local match syntax, invalid regexes and unsafe paths are rejected. Invalid saved JSON never silently falls back. Refile previews exact planned insertion bytes and requires an explicit yes; cross-file writes preserve both paths on uncertain outcomes and never automatically retry or roll back. Sparse Tree stays window-local and does not change Source/history.</p>
			</div>
		</section>
	)
}
