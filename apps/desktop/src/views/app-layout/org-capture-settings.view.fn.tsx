import * as E from "fp-ts/Either"
import { useEffect, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { getOrgCaptureConfiguration, useOrgCaptureConfiguration } from "@/hooks/use-org-capture-configuration"
import { repairOrgConfigurationStorage } from "@/hooks/use-org-input-configuration"
import { clearOrgCaptureDrafts, hasOrgCaptureDrafts } from "@/io/storage/org-capture-draft.storage"
import { parseOrgCaptureConfiguration } from "@/pipes/org/org-capture-configuration.pipe"
import { DEFAULT_ORG_CAPTURE_CONFIGURATION } from "@/pipes/org/org-capture-template.pipe"
import { Button } from "@/views/ui/button"
import { Label } from "@/views/ui/label"
import { Textarea } from "@/views/ui/textarea"
import { OrgConfirmDialog } from "../org-workspace/org-action-dialog.view.fn"

export function OrgCaptureSettings() {
	const savedConfiguration = useOrgCaptureConfiguration()
	const savedJson = savedConfiguration.raw
	const setSavedJson = useSettings((state) => state.setOrgCaptureConfigurationJson)
	const [json, setJson] = useState(savedJson)
	const [storageError, setStorageError] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)
	const [confirmation, setConfirmation] = useState<{ readonly raw: string; readonly generation: object } | null>(null)
	useEffect(() => { setJson(savedJson) }, [savedJson])
	const configuration = parseOrgCaptureConfiguration(json)

	const save = (raw: string, confirmedDeletion = false) => {
		setStorageError(null)
		setStatus(null)
		const next = parseOrgCaptureConfiguration(raw)
		if (E.isLeft(next)) return
		// Check journal keys only, including stale records from a previous configuration.
		if (!next.right.draftRecovery) {
			const existing = hasOrgCaptureDrafts()
			if (E.isLeft(existing)) {
				setStorageError(`Cannot check saved Capture drafts: ${existing.left.message}. Configuration was not changed.`)
				return
			}
			if (existing.right) {
				if (!confirmedDeletion) {
					setConfirmation({ raw, generation: getOrgCaptureConfiguration().generation })
					return
				}
				const cleared = clearOrgCaptureDrafts()
				if (E.isLeft(cleared)) {
					setStorageError(`Cannot delete saved Capture drafts: ${cleared.left.message}. Recovery permission was not changed.`)
					return
				}
			}
		}
		try {
			setSavedJson(raw)
		} catch (error) {
			setStorageError(`Cannot save Capture configuration: ${error instanceof Error ? error.message : "storage unavailable"}. Saved recovery permission was not changed.`)
			return
		}
		repairOrgConfigurationStorage()
		setJson(raw)
		setStatus(raw.trim() ? "Capture configuration saved." : "Default Capture configuration restored; draft recovery is off.")
	}

	return (
		<section aria-labelledby="org-capture-settings-title" className="space-y-4">
			<div>
				<h3 id="org-capture-settings-title" className="text-lg font-medium">Org Capture</h3>
				<p className="text-sm text-muted-foreground">
					Configure the templates used by Capture in the Org workspace. Saving settings never writes Org files.
					A blank editor uses the built-in TODO and note templates in inbox.org.
				</p>
			</div>
			<p id="org-capture-recovery-warning" className="rounded-md border p-3 text-sm">
				Draft recovery is off by default: unsaved Capture text stays in memory only. Setting
				{" "}<code>"draftRecovery": true</code> explicitly permits storing unsaved draft bodies as plaintext
				in local app storage on this device, without encryption. Do not enable it for sensitive text.
				Turning it off or restoring defaults requires deleting saved drafts; cancellation or a storage
				failure keeps the saved permission unchanged. Recovery never automatically writes Org files.
			</p>
			{savedConfiguration.error && <p role="alert" className="text-sm text-destructive">Saved Capture configuration is unavailable: {savedConfiguration.error}</p>}
			<form onSubmit={(event) => { event.preventDefault(); save(json) }} className="space-y-3">
				<Label htmlFor="org-capture-configuration-json">Capture configuration JSON</Label>
				<Textarea
					id="org-capture-configuration-json"
					value={json}
					onChange={(event) => { setJson(event.target.value); setStorageError(null); setStatus(null) }}
					rows={14}
					spellCheck={false}
					className="font-mono"
					aria-invalid={E.isLeft(configuration)}
					aria-describedby={`org-capture-config-help org-capture-recovery-warning${E.isLeft(configuration) ? " org-capture-config-error" : ""}`}
					placeholder="Blank uses the built-in Capture configuration"
				/>
				{E.isLeft(configuration) && <p id="org-capture-config-error" role="alert" className="text-sm text-destructive">{configuration.left.message}</p>}
				{storageError && <p role="alert" className="text-sm text-destructive">{storageError}</p>}
				{status && <p role="status" className="text-sm">{status}</p>}
				<div className="flex flex-wrap gap-2">
					<Button type="submit" disabled={E.isLeft(configuration)}>Save Capture configuration</Button>
					<Button type="button" variant="outline" onClick={() => save("")}>Restore Capture defaults</Button>
					<Button type="button" variant="outline" onClick={() => {
						setJson(JSON.stringify(DEFAULT_ORG_CAPTURE_CONFIGURATION, null, 2))
						setStorageError(null)
						setStatus("Default JSON loaded for editing; changes are not saved yet.")
					}}>Load default JSON for editing</Button>
				</div>
			</form>
			<OrgConfirmDialog
				open={confirmation !== null}
				title="Turn off Capture recovery?"
				description="Permanently delete all locally saved Capture drafts? Unsaved draft text cannot be recovered after deletion. Org files will not be changed."
				confirmLabel="Delete saved drafts and turn off recovery"
				destructive
				onOpenChange={(open) => { if (!open) setConfirmation(null) }}
				onConfirm={() => {
					const request = confirmation
					setConfirmation(null)
					if (!request) return
					if (getOrgCaptureConfiguration().generation !== request.generation) {
						setStorageError("Saved configuration changed while confirmation was open. Review the current configuration before retrying.")
						return
					}
					save(request.raw, true)
				}}
			/>
			<div id="org-capture-config-help" className="space-y-2 text-sm text-muted-foreground">
				<p>
					Use exactly <code>version: 1</code>, <code>templates: [...]</code>, and a boolean <code>draftRecovery</code>.
					Each template needs a unique <code>id</code>, a <code>label</code>, <code>entryType</code>, <code>target</code>,
					and Org <code>source</code>. Entry types: <code>entry</code> (level-one heading), <code>plain</code>,
					<code>item</code> (list item), <code>checkitem</code> (checkbox item), or <code>table-line</code> (table row).
				</p>
				<p>
					Targets use a safe workspace-relative <code>relativePath</code> ending in <code>.org</code>; no absolute
					paths, <code>..</code>, or backslashes. Use <code>{'{"kind":"file","relativePath":"inbox.org"}'}</code>,
					<code>{'{"kind":"heading","relativePath":"work.org","headingPath":["Work","Inbox"]}'}</code>, or
					<code>{'{"kind":"datetree","relativePath":"journal.org"}'}</code>. A datetree can also have a
					<code>headingPath</code>; its date is frozen when Capture starts, not configured. Heading titles must
					be nonblank single lines. Missing headings are created; ambiguous existing headings are rejected.
				</p>
				<p>
					Source grammar: <code>%?</code> sets the cursor; <code>%t/%T</code> insert active date/date-time,
					<code>%u/%U</code> inactive date/date-time; <code>{"%^{Prompt|default|candidate...}"}</code> asks for text;
					<code>{"%\\1"}</code> reuses the first prompt answer (write <code>{"%\\\\1"}</code> in JSON).
					<code>%i</code> inserts the region with line indentation; <code>%a</code> inserts the annotation,
					<code>%l</code> its link without description, and <code>%L</code> its unbracketed link.
					<code>%f/%F</code> insert the source basename/absolute path.
					<code>{"\\%"}</code> escapes a literal percent (write <code>{"\\\\%"}</code> inside JSON).
					Prompt answers and inserted text are literal, never evaluated or expanded again.
				</p>
				<p>
					<code>{"%<%Y-%m-%d>"}</code> formats the capture date. Allowed format directives:
					<code>%Y %y %m %d %e %H %I %M %S %a %A %b %B %p %F %R %T %%</code>.
					Lisp <code>%(…)</code>, file includes <code>%[…]</code>, executable functions, shell commands,
					unknown fields, specialized prompt postfixes, and unsupported escapes are rejected.
					Fix inline errors before saving; invalid saved JSON remains diagnosed even while a valid replacement is drafted.
					Configuration changes, including A→B→A and native storage transitions, revoke prior deletion approvals and captured producers.
				</p>
			</div>
		</section>
	)
}
