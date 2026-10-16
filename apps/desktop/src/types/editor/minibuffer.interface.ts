import type { OrgDateContext } from "@/pipes/org/org-date-reader.pipe"

export type OrgMinibufferAcceptResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly message: string }

export interface OrgMinibufferCandidate {
	readonly value: string
	readonly label: string
	readonly detail?: string
	readonly shortcut?: string
	readonly unavailableReason?: string
	readonly searchText?: string
	/** Navigation ranks the real path separately from display markers and stable buffer IDs. */
	readonly path?: string
}

/** Upstream modal consumers receive the sole host's real input and native events. */
export interface OrgMinibufferNativeInput {
	readonly bind: (input: HTMLInputElement | null, setValue: (value: string) => void) => void
	readonly onInput: (event: Event, input: HTMLInputElement) => void
	readonly onKeyDown: (event: KeyboardEvent, input: HTMLInputElement) => boolean
	readonly onKeyUp: (event: KeyboardEvent, input: HTMLInputElement) => void
	readonly selectValueOnOpen?: boolean
}

/** Parameter collection only: the command flow owns validation and commit. */
export interface OrgMinibufferSession {
	readonly id: number
	readonly prompt: string
	readonly inputLabel?: string
	/** Captured operation/target context, displayed read-only beside the parameter input. */
	readonly description?: string
	readonly emptyMessage?: string
	/** Read-only exact source projection; never an edit authority. */
	readonly preview?: { readonly title: string; readonly source: string; readonly detail: string }
	/** A calendar projection beside the single parameter input; never a second session. */
	readonly calendar?: OrgDateContext
	readonly historyKey?: string
	readonly completion?: "token" | "value"
	/** Command/file selection can accept the highlighted candidate, unlike free-form metadata. */
	readonly acceptCandidate?: boolean
	readonly initialInput: string
	/** UTF-16 input offsets applied once on open; native readers retain selection ownership. */
	readonly initialSelection?: readonly [number, number]
	readonly candidates: readonly string[]
	readonly annotatedCandidates?: readonly OrgMinibufferCandidate[]
	readonly matchingMode?: "substring" | "multi-term" | "path"
	/** Default true. Disable when an in-flight commit cannot safely be cancelled. */
	readonly cancelWhileAccepting?: boolean
	readonly nativeInput?: OrgMinibufferNativeInput
	readonly onAccept: (
		input: string,
	) => OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
	readonly onCancel: () => void
}
