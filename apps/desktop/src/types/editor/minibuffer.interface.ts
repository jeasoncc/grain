/** Parameter collection only: the command flow owns validation and commit. */
export interface OrgMinibufferSession {
	readonly id: number
	readonly prompt: string
	readonly initialInput: string
	readonly candidates: readonly string[]
	readonly onAccept: (
		input: string,
	) => { readonly ok: true } | { readonly ok: false; readonly message: string }
	readonly onCancel: () => void
}
