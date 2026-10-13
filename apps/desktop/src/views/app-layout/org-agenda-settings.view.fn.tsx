import * as E from "fp-ts/Either"
import { useEffect, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { useOrgAgendaConfiguration } from "@/hooks/use-org-agenda-configuration"
import { repairOrgConfigurationStorage } from "@/hooks/use-org-input-configuration"
import { DEFAULT_ORG_AGENDA_CONFIGURATION, parseOrgAgendaConfiguration } from "@/pipes/org/org-agenda-configuration.pipe"
import { Button } from "@/views/ui/button"
import { Label } from "@/views/ui/label"
import { Textarea } from "@/views/ui/textarea"

export function OrgAgendaSettings() {
	const savedConfiguration = useOrgAgendaConfiguration()
	const savedJson = savedConfiguration.raw
	const setSavedJson = useSettings(state => state.setOrgAgendaConfigurationJson)
	const [json, setJson] = useState(savedJson)
	const [storageError, setStorageError] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)
	useEffect(() => { setJson(savedJson) }, [savedJson])
	const configuration = parseOrgAgendaConfiguration(json)
	const save = (raw: string) => {
		setStorageError(null)
		setStatus(null)
		if (E.isLeft(parseOrgAgendaConfiguration(raw))) return
		try { setSavedJson(raw) } catch (error) {
			setStorageError(`Cannot save Agenda configuration: ${error instanceof Error ? error.message : "storage unavailable"}. Saved views were not changed.`)
			return
		}
		repairOrgConfigurationStorage()
		setJson(raw)
		setStatus(raw.trim() ? "Agenda configuration saved. Select a named view in Agenda." : "All-date Agenda display restored.")
	}
	return (
		<section aria-labelledby="org-agenda-settings-title" className="space-y-4">
			<div>
				<h3 id="org-agenda-settings-title" className="text-lg font-medium">Org Agenda</h3>
				<p className="text-sm text-muted-foreground">Declare named dated, TODO, and match lists, then explicitly select a view in the shared Agenda tool. Blank keeps the existing all-date Source display; no daily preference or key is invented. Settings never write Org files.</p>
			</div>
			{savedConfiguration.error && <p role="alert" className="text-sm text-destructive">Saved Agenda configuration is unavailable: {savedConfiguration.error}</p>}
			<form onSubmit={event => { event.preventDefault(); save(json) }} className="space-y-3">
				<Label htmlFor="org-agenda-configuration-json">Org Agenda configuration JSON</Label>
				<Textarea id="org-agenda-configuration-json" value={json} onChange={event => { setJson(event.target.value); setStorageError(null); setStatus(null) }} rows={16} spellCheck={false} className="font-mono" aria-invalid={E.isLeft(configuration)} aria-describedby={`org-agenda-config-help${E.isLeft(configuration) ? " org-agenda-config-error" : ""}`} placeholder="Blank retains all-date display" />
				{E.isLeft(configuration) && <p id="org-agenda-config-error" role="alert" className="text-sm text-destructive">{configuration.left.message}</p>}
				{storageError && <p role="alert" className="text-sm text-destructive">{storageError}</p>}
				{status && <p role="status" className="text-sm">{status}</p>}
				<div className="flex flex-wrap gap-2">
					<Button type="submit" disabled={E.isLeft(configuration)}>Save Org Agenda configuration</Button>
					<Button type="button" variant="outline" onClick={() => save("")}>Restore all-date Agenda display</Button>
					<Button type="button" variant="outline" onClick={() => { setJson(JSON.stringify(DEFAULT_ORG_AGENDA_CONFIGURATION, null, 2)); setStorageError(null); setStatus("All-date JSON loaded for editing; not saved yet.") }}>Load all-date JSON for editing</Button>
				</div>
			</form>
			<div id="org-agenda-config-help" className="space-y-2 text-sm text-muted-foreground">
				<p>Root requires exactly <code>version: 1</code> and <code>views</code> (0–64 views). Each view requires exactly <code>id</code> (unique ASCII name, 1–64 characters), <code>name</code> (1–256 display characters), <code>files</code>, <code>mode</code>, <code>todo</code>, <code>match</code>, <code>window</code>, <code>overdue</code>, and <code>deadlineWarningDays</code>. No field is inferred.</p>
				<p><code>files: null</code> selects workspace files; an array selects only exact unique safe relative .org paths (at most 500). Empty means no files. No glob expansion, absolute paths, traversal, or extra grants. <code>todo</code> is null (unrestricted), "pending" (Source-declared pending states), or up to 256 exact unique keywords. <code>match</code> is null or the existing GNU Org tags/property/TODO match expression, optionally prefixed <code>match:</code>. Matching reuses Org behavior inheritance and genuine native FILE/BLOCKED/CLOCKSUM/string-collation context.</p>
				<p>Matching accepts exactly the Sparse Tree inlet: conventional <code>+work-boss|home</code>, optional <code>match:</code> prefix, GNU property/regexp/TODO-state expressions, plus existing <code>todo</code>, <code>todo:STATE</code>, <code>tag:NAME</code>, <code>itag:NAME</code>, and <code>text:LITERAL</code> forms. Prefix <code>match:</code> disambiguates a conventional tag named todo from the pending-state shorthand.</p>
				<p><code>mode: "dates"</code> requires <code>{'window: {"start":"today","span":7}'}</code>. Start is an ISO Gregorian date or <code>today</code> with optional signed day offset (<code>today-2d</code>); span is 1–366 inclusive days. The query captures one local calendar, then derives active timestamp ranges and recurrence without changing Source. Repeater modes +, ++ and .+ share occurrence dates; their different completion effects remain Source commands.</p>
				<p>Dated views require an explicit <code>overdue</code> boolean and <code>deadlineWarningDays</code> (null disables warnings; 0 disables prewarning; 1–366 is the lead time, overridden by a Source warning cookie). Overdue scheduled/expired deadline and upcoming deadline warning rows appear only on captured today if the window contains it, not on every historical/future display day. Completed tasks do not acquire carry-over warnings. Scheduled delay cookies are respected. Source anchors, not virtual dates, own actions and return-to-source.</p>
				<p><code>mode: "todo"</code> requires a non-null TODO filter. <code>mode: "match"</code> requires a non-null match expression. Both require <code>window: null</code>, <code>overdue: false</code>, and <code>deadlineWarningDays: null</code>; each matching eligible heading appears once, including genuinely undated headings, with no invented timestamp provenance.</p>
				<p>Unknown fields and invalid saved configuration fail visibly closed. Changes, including A→B→A, retire old query/action readers and retained note continuations; already accepted canonical effects drain. A dated view is limited to 100,000 projected rows; exceeding it rejects the query instead of truncating or expanding indefinitely.</p>
			</div>
		</section>
	)
}
