import type { ApplicationCommandResult } from "@/views/application/application-command-provider"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { OrgCommandId } from "@/flows/org-command/org-workspace-command"
import type { OrgCapturedSparseClock } from "@/flows/org-workspace/org-clock-owner"

/** Root-only request. Nothing in this object is serialized into the child. */
export interface OrgNativeWorkflowRequest {
 readonly id: OrgCommandId
 readonly target: OrgEditorCommandTarget
 readonly bufferId: string
 readonly windowId: string
 readonly path: string
 readonly origin: ApplicationToolOrigin
 readonly isCurrent: () => boolean
 readonly isLive: () => boolean
 /** Deliberate navigation rebinds only this native view; never activates Main. */
 readonly navigate: (bufferId: string, line: number) => Promise<boolean>
 readonly complete: (result: ApplicationCommandResult) => Promise<void>
}
export type OrgNativeWorkflowHandler = (request: OrgNativeWorkflowRequest) => void | Promise<void>
let handler: OrgNativeWorkflowHandler | null = null
let clockHandler: ((source: string, filename: string) => OrgCapturedSparseClock) | null = null
export function registerOrgNativeClockHandler(next: (source: string, filename: string) => OrgCapturedSparseClock): () => void {
 if (clockHandler) throw new Error("The native clock context owner is already registered")
 clockHandler = next
 return () => { if (clockHandler === next) clockHandler = null }
}
export function readOrgNativeClockCapture(source: string, filename: string): OrgCapturedSparseClock {
 if (!clockHandler) throw new Error("The root clock context owner is unavailable")
 return clockHandler(source, filename)
}

/** One mounted root consumer, not another application command implementation. */
export function registerOrgNativeWorkflowHandler(next: OrgNativeWorkflowHandler): () => void {
 if (handler) throw new Error("The native workflow consumer is already registered")
 handler = next
 return () => { if (handler === next) handler = null }
}
export function dispatchOrgNativeWorkflow(request: OrgNativeWorkflowRequest): boolean {
 const consumer = handler
 if (!consumer) return false
 void Promise.resolve().then(() => {
  if (handler !== consumer || !request.isCurrent()) return request.complete({ kind: "rejected", message: "The captured native workflow origin retired before invocation" })
  return consumer(request)
 }).catch(cause => request.complete({ kind: "rejected", message: cause instanceof Error ? cause.message : String(cause) }))
 return true
}
