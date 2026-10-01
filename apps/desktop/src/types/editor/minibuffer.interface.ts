export type OrgMinibufferAcceptResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly message: string }

/** Parameter collection only: the command flow owns validation and commit. */
export interface OrgMinibufferSession {
	readonly id: number
	readonly prompt: string
	readonly historyKey?: string
	readonly completion?: "token" | "value"
	/** Command/file selection can accept the highlighted candidate, unlike free-form metadata. */
	readonly acceptCandidate?: boolean
	readonly initialInput: string
	readonly candidates: readonly string[]
	/** Default true. Disable when an in-flight commit cannot safely be cancelled. */
	readonly cancelWhileAccepting?: boolean
	readonly onAccept: (
		input: string,
	) => OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>
	readonly onCancel: () => void
}
