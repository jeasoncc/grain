import { invoke } from "@tauri-apps/api/core"

export interface OrgExportSaveRequest {
	readonly format: "html" | "markdown"
	readonly suggestedName: string
	readonly content: string
	readonly workspaceRoot: string
	readonly capabilityToken: string
}
export type OrgExportSaveOutcome =
	| { readonly kind: "saved"; readonly path: string; readonly recoveryPath: string }
	| { readonly kind: "cancelled" }

/** The native picker grants one output; no frontend destination or ambient writer exists. */
export const saveOrgExport = (request: OrgExportSaveRequest): Promise<OrgExportSaveOutcome> =>
	invoke("save_org_export", { ...request })
