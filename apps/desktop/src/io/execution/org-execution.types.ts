/** One immutable, explicit high-privilege native execution intent. No implicit shell or env. */
export interface OrgExternalExecutionRequest {
	readonly workspaceRoot: string
	readonly capabilityToken: string
	/** Absolute executable path; shell interpreters must be explicitly requested here. */
	readonly program: string
	readonly argv: readonly string[]
	/** Complete process environment. Native execution clears the inherited environment. */
	readonly environment: Readonly<Record<string, string>>
	/** Exact UTF-8 stdin, including complete code/script when delivered through stdin. */
	readonly stdin: string | null
}

export interface OrgExternalExecutionResult {
	readonly outcome: "cancelled-before-start" | "completed" | "failed"
	/** Opaque read-only output receipt, never a replayable execution authorization. */
	readonly executionId: string | null
	readonly stdoutBytes: string
	readonly stderrBytes: string
	readonly exitCode: number | null
	readonly signal: number | null
	readonly error: string | null
}

export interface OrgExecutionOutputRequest {
	readonly executionId: string
	readonly stream: "stdout" | "stderr"
	/** Unsigned decimal string: native byte offsets do not lose integer precision. */
	readonly offset: string
	/** Native accepts 1..65536 bytes per page. */
	readonly limit: number
}

export interface OrgExecutionOutputPage {
	/** Exact bytes, not lossy UTF-8 conversion. Decode only at the display/application boundary. */
	readonly bytes: readonly number[]
	readonly nextOffset: string
	readonly eof: boolean
}

export interface OrgExecutionService {
	readonly getEnabled: () => Promise<boolean>
	readonly setEnabled: (enabled: boolean) => Promise<void>
	/** No AbortSignal: a started native call must drain; source retirement only makes its output stale. */
	readonly execute: (request: OrgExternalExecutionRequest) => Promise<OrgExternalExecutionResult>
	readonly readOutput: (request: OrgExecutionOutputRequest) => Promise<OrgExecutionOutputPage>
	/** Release only when the copyable tool result is closed, not when its source owner retires. */
	readonly releaseOutput: (executionId: string) => Promise<void>
}
