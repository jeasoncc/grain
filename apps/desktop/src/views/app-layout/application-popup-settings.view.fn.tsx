import * as E from "fp-ts/Either"
import { useEffect, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { useApplicationPopupConfiguration } from "@/hooks/use-application-popup-configuration"
import { repairOrgConfigurationStorage } from "@/hooks/use-org-input-configuration"
import { parseApplicationPopupConfiguration } from "@/flows/application/application-popup-configuration"
import { Button } from "@/views/ui/button"
import { Label } from "@/views/ui/label"
import { Textarea } from "@/views/ui/textarea"

const example = JSON.stringify({ version: 1, rules: [{ id: "agenda", layout: "side", size: { widthPercent: 35 } }, { id: "capture", layout: "popup", size: { widthPercent: 70, heightPercent: 60 } }, { prefix: "babel:", layout: "bottom", size: { heightPercent: 35 } }] }, null, 2)

export function ApplicationPopupSettings() {
	const savedConfiguration = useApplicationPopupConfiguration()
	const saved = savedConfiguration.raw
	const setSaved = useSettings((state) => state.setApplicationPopupConfigurationJson)
	const [draft, setDraft] = useState(saved)
	const [storageError, setStorageError] = useState<string | null>(null)
	const [status, setStatus] = useState<string | null>(null)
	useEffect(() => { setDraft(saved) }, [saved])
	const parsed = parseApplicationPopupConfiguration(draft)
	const persisted = savedConfiguration.parsed
	const save = (raw: string) => {
		setStorageError(null)
		setStatus(null)
		if (E.isLeft(parseApplicationPopupConfiguration(raw))) return
		try { setSaved(raw) } catch (error) {
			setStorageError(error instanceof Error ? error.message : "Could not persist popup configuration.")
			return
		}
		repairOrgConfigurationStorage()
		setDraft(raw)
		setStatus(raw.trim() ? "Tool placement saved; open drafts remain mounted." : "Each producer's existing tool placement restored.")
	}
	return <section aria-labelledby="application-popup-settings-title" className="space-y-4">
		<h2 id="application-popup-settings-title" className="text-lg font-semibold">Application tool placement</h2>
		<p className="text-sm text-muted-foreground">Blank preserves every producer's existing layout. Placement never saves or discards a draft, changes its Source/history owner, grants access, or cancels an accepted operation. Changes invalidate unaccepted close confirmations for the affected policy.</p>
		{E.isLeft(persisted) && <p role="alert">Saved popup configuration is invalid: {persisted.left.message}</p>}
		<form className="space-y-3" onSubmit={(event) => { event.preventDefault(); save(draft) }}>
			<Label htmlFor="application-popup-json">Versioned popup JSON</Label>
			<Textarea id="application-popup-json" value={draft} rows={14} className="font-mono text-xs" aria-invalid={E.isLeft(parsed)} aria-describedby="application-popup-help" onChange={(event) => { setDraft(event.target.value); setStatus(null); setStorageError(null) }} />
			{E.isLeft(parsed) && <p role="alert">{parsed.left.message}</p>}
			{storageError && <p role="alert">{storageError}</p>}
			{status && <p role="status">{status}</p>}
			<div className="flex gap-2"><Button type="submit" disabled={E.isLeft(parsed) || draft === saved && E.isRight(persisted)}>Save tool placement</Button><Button type="button" variant="outline" onClick={() => save("")}>Restore producer placement</Button></div>
		</form>
		<div id="application-popup-help" className="space-y-2 text-sm text-muted-foreground">
			<p>Closed schema: version: 1 and rules (at most 128). Every rule requires exactly one literal id or explicit prefix, plus layout: main, side, bottom, or popup. Optional size requires widthPercent and/or heightPercent, integer 10–90. Unknown fields, wildcard selectors, duplicate selectors and unbounded sizes are errors. Exact IDs override family prefixes; otherwise each existing producer policy is unchanged.</p>
			<p>Built-in IDs: agenda (main), inspector (side), capture, todo-note, org-roam (bottom). Dynamic IDs: babel:&lt;execution ID&gt;, export:&lt;export ID&gt;, file-review:&lt;review ID&gt;, remark:&lt;source path&gt; (bottom). Only those four colon-terminated prefixes are accepted. Exact literal IDs also address explicitly registered trusted compiled tools; this does not load or execute an extension. Unmatched rules are diagnosed by the live inventory until their producer registers.</p>
			<p>Non-main Agenda leaves Source visible; main Agenda retains the existing main-view behavior. Side and bottom frames are docked beside/below the workspace; popup is a nonmodal floating tool frame, not a parameter dialog. Omitted sizes use the frame's bounded natural layout; explicit percentages are viewport-relative, capped within the application viewport.</p>
			<details><summary>Configuration example</summary><pre className="overflow-auto whitespace-pre-wrap">{example}</pre></details>
		</div>
	</section>
}
