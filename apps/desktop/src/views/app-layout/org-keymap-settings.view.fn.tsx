import * as E from "fp-ts/Either"
import { useEffect, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { parseOrgKeymapConfiguration, DEFAULT_ORG_KEYMAP_CONFIGURATION } from "@/pipes/org/org-keymap-configuration.pipe"
import { Button } from "@/views/ui/button"
import { Label } from "@/views/ui/label"
import { Textarea } from "@/views/ui/textarea"
import { repairOrgConfigurationStorage, useOrgInputConfiguration } from "@/hooks/use-org-input-configuration"
import { getOrgInputCommandMetadata } from "@/flows/org-command/org-input-command-metadata"

const example = JSON.stringify({ version: 1, bindings: [{ scope: "org-source", key: "A-t", command: "todo" }], leaders: [{ scope: "org-source", key: "C-l", map: "planning" }], transients: [{ id: "planning", label: "Planning", scope: "org-source", timeoutMs: null, bindings: [{ key: "s", command: "scheduled" }, { key: "d", command: "deadline" }] }] }, null, 2)

/** A draft is never authority until validation and persistence both succeed. */
export function OrgKeymapSettings() {
	const savedConfiguration = useOrgInputConfiguration()
	const saved = savedConfiguration.raw
	const setSaved = useSettings((state) => state.setOrgKeymapConfigurationJson)
	const [draft, setDraft] = useState(saved)
	const [storageError, setStorageError] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)
	useEffect(() => { setDraft(saved) }, [saved])
	const parsed = parseOrgKeymapConfiguration(draft)
	const save = (raw: string) => {
		setStorageError(null)
		setStatus(null)
		if (E.isLeft(parseOrgKeymapConfiguration(raw))) return
		try { setSaved(raw) } catch (error) {
			setStorageError(error instanceof Error ? error.message : "Could not persist keymap configuration.")
			return
		}
		repairOrgConfigurationStorage()
		setDraft(raw)
		setStatus(raw.trim() ? "Keymap configuration saved; old transients and captured commands cancelled." : "Default keymaps restored.")
	}
	return <section aria-labelledby="org-keymap-settings-title" className="space-y-4">
		<h2 id="org-keymap-settings-title" className="text-lg font-semibold">Org input keymaps</h2>
		<p className="text-sm text-muted-foreground">Blank uses existing keys, including C-c; no Space leader is enabled by default. Overrides merge by scope/key and transient ID. Invalid saved configuration disables command routing until repaired, not ordinary typing.</p>
		{savedConfiguration.error && <p role="alert">Saved keymap configuration is unavailable: {savedConfiguration.error}</p>}
		<form className="space-y-3" onSubmit={(event) => { event.preventDefault(); save(draft) }}>
			<Label htmlFor="org-keymap-json">Versioned keymap JSON</Label>
			<Textarea id="org-keymap-json" value={draft} rows={14} className="font-mono text-xs" aria-invalid={E.isLeft(parsed)} aria-describedby="org-keymap-help" onChange={(event) => { setDraft(event.target.value); setStatus(null); setStorageError(null) }} />
			{E.isLeft(parsed) && <p role="alert">{parsed.left.message}</p>}
			{storageError && <p role="alert">{storageError}</p>}
			{status && <p role="status">{status}</p>}
			<div className="flex gap-2"><Button type="submit" disabled={E.isLeft(parsed) || draft === saved && !savedConfiguration.error}>Save keymaps</Button><Button type="button" variant="outline" onClick={() => save("")}>Restore defaults</Button></div>
		</form>
		<div id="org-keymap-help" className="space-y-2 text-sm text-muted-foreground">
			<p>Closed schema: version: 1, optional bindings, leaders and transients arrays; unknown fields are errors. Scopes: application, workspace, org-source, org-capture, org-roam, org-agenda, org-todo-note, org-remark. Tool scopes inherit Source, workspace and application maps; more specific scopes win. bindings entries: scope, key, command (a trusted command ID, or null to unbind). leaders entries: scope, key, map. Transients: id, label, scope, timeoutMs (null or 0–2147483647), bindings with key and exactly one command or map. Child maps must share scope. Escape cancels a transient; C-g cancels unless that map explicitly binds it. Unmatched keys fall through without losing text. Metadata only enables discoverability; the current owned producer must still authorize execution.</p>
			<p>Keys: C- (Control), M- (Meta), A- (Alt), S- (Shift), Mod- (Control or Meta), followed by a DOM key name or character. Space must be explicit. IME, AltGraph, repeat, consumed events and owned minibuffer input never start commands. C-c with selected text stays native copy. Choosing a printable leader intentionally reserves that key.</p>
			<p>Optional <code>modalEngine</code>: <code>null</code> (default) or <code>"vim"</code>. Vim uses the installed upstream CodeMirror engine, not Emacs Evil compatibility. Shared IME/minibuffer ownership, scoped commands and transients precede it; an unmatched transient still checks scoped bindings before modal or ordinary input.</p>
			<details><summary>Configuration example</summary><pre className="overflow-auto whitespace-pre-wrap">{example}</pre></details>
			<details><summary>Default command bindings</summary><pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(DEFAULT_ORG_KEYMAP_CONFIGURATION.bindings, null, 2)}</pre></details>
			<details><summary>Available command IDs</summary><pre className="overflow-auto whitespace-pre-wrap">{getOrgInputCommandMetadata().map(({ id, label }) => `${id}: ${label}`).join("\n")}</pre></details>
		</div>
	</section>
}
