import { invoke } from "@tauri-apps/api/core"
import type { InvokeCommand } from "@/io/file/org-file.repository"
import type {
	OrgExecutionOutputPage,
	OrgExecutionService,
	OrgExternalExecutionResult,
} from "./org-execution.types"

export const ORG_EXECUTION_COMMANDS = {
	getEnabled: "get_org_execution_enabled",
	setEnabled: "set_org_execution_enabled",
	execute: "execute_org_external",
	readOutput: "read_org_execution_output",
	releaseOutput: "release_org_execution_output",
} as const

/** Native consent is mandatory on every execute call, regardless of settings/configuration. */
export const createOrgExecutionService = (
	invokeCommand: InvokeCommand = invoke,
): OrgExecutionService => ({
	getEnabled: () => invokeCommand<boolean>(ORG_EXECUTION_COMMANDS.getEnabled),
	setEnabled: (enabled) => invokeCommand<void>(ORG_EXECUTION_COMMANDS.setEnabled, { enabled }),
	execute: (request) => {
		// Capture before invoking so later configuration/source mutation cannot alter the approval.
		// No application body authority, command-string interpolation, retry or abort mechanism.
		const snapshot = {
			workspaceRoot: request.workspaceRoot,
			capabilityToken: request.capabilityToken,
			program: request.program,
			argv: [...request.argv],
			environment: { ...request.environment },
			stdin: request.stdin,
		}
		return invokeCommand<OrgExternalExecutionResult>(ORG_EXECUTION_COMMANDS.execute, {
			request: snapshot,
		})
	},
	readOutput: (request) =>
		invokeCommand<OrgExecutionOutputPage>(ORG_EXECUTION_COMMANDS.readOutput, {
			executionId: request.executionId,
			stream: request.stream,
			offset: request.offset,
			limit: request.limit,
		}),
	releaseOutput: (executionId) =>
		invokeCommand<void>(ORG_EXECUTION_COMMANDS.releaseOutput, { executionId }),
})

export const orgExecutionService = createOrgExecutionService()
