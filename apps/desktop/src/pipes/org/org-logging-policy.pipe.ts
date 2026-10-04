import { type OrgLoggingDeclaration, snapshotOrgLoggingScopes } from "./org-logging-scope.pipe"
import { eligibleOrgSourceLines, parseOrgTodoKeywords } from "./org-text.pipe"

export interface OrgStateLogging {
	readonly state: string
	readonly incoming: string
	readonly outgoing: string
}
export interface OrgLoggingPolicy {
	readonly states: readonly OrgStateLogging[]
	readonly done: "none" | "time" | "note"
	readonly drawer: string | null
}
export interface OrgLoggingProvenance {
	readonly from: number
	readonly to: number
	readonly tier: "file-options" | "file-properties" | "heading-properties"
	readonly headingFrom: number | null
}
export type OrgLoggingPolicyResult =
	| {
			readonly kind: "policy"
			readonly policy: OrgLoggingPolicy
			readonly provenance: readonly OrgLoggingProvenance[]
	  }
	| { readonly kind: "rejected"; readonly reason: string }

const reject = (reason: string): OrgLoggingPolicyResult => ({ kind: "rejected", reason })
const stateToken = /^([^\s()|!@/"\\]+)(?:\(([^\s()!@/]?)([!@]?)(?:\/([!@]))?\))?$/
export const parseOrgLogDrawerName = (value: string): string | null | undefined => {
	const name = value.trim().replace(/^"([^"\r\n]*)"$/, "$1")
	if (/^nil$/i.test(name)) return null
	if (/^t$/i.test(name)) return "LOGBOOK"
	return /^[A-Za-z][A-Za-z0-9_-]*$/.test(name) && !/^(END|PROPERTIES)$/i.test(name)
		? name
		: undefined
}

/**
 * Precedence: state defaults + ordered STARTUP -> file drawer compatibility ->
 * file properties -> root-to-target properties. Within each property scope,
 * LOGGING is applied before explicit LOG_INTO_DRAWER, independent of line order.
 * Empty means inherit. Plus accumulates ordered tokens (including an inherited
 * policy when no base is present); duplicate bases are ambiguous. nil must be
 * standalone: clears every state flag and done policy, resets drawer to none.
 * A later nonnil overlay never resurrects flags cleared by nil.
 * This intentionally supports neither repeat logging nor arbitrary Org Lisp.
 */
export const resolveOrgLoggingPolicy = (
	source: string,
	target: { readonly from: number },
): OrgLoggingPolicyResult => {
	const keywords = parseOrgTodoKeywords(source)
	const configured = [...keywords.todo, ...keywords.done]
	const eligible = eligibleOrgSourceLines(source, new Set(configured))
	let policy: OrgLoggingPolicy = {
		done: "none",
		drawer: null,
		states: configured.map((state) => ({ incoming: "", outgoing: "", state })),
	}
	const provenance: OrgLoggingProvenance[] = []
	const declared: string[] = []
	for (const line of eligible) {
		if (/^#\+(?:TODO|SEQ_TODO):/i.test(line.text)) {
			const value = line.text.replace(/^#\+(?:TODO|SEQ_TODO):[ \t]*/i, "").trim()
			const tokens = value.split(/[ \t]+/)
			if (
				!value ||
				tokens.filter((token) => token === "|").length > 1 ||
				tokens[0] === "|" ||
				tokens.at(-1) === "|"
			)
				return reject("malformed-todo-directive")
			for (const token of tokens.filter((token) => token !== "|")) {
				const match = stateToken.exec(token)
				if (!match || declared.includes(match[1])) return reject("ambiguous-todo-directive")
				declared.push(match[1])
				policy = {
					...policy,
					states: policy.states.map((state) =>
						state.state === match[1]
							? { incoming: match[3] ?? "", outgoing: match[4] ?? "", state: state.state }
							: state,
					),
				}
			}
			provenance.push({
				from: line.from,
				headingFrom: null,
				tier: "file-options",
				to: line.breakTo,
			})
		}
		if (/^#\+STARTUP:/i.test(line.text)) {
			for (const token of line.text
				.replace(/^#\+STARTUP:/i, "")
				.trim()
				.toLowerCase()
				.split(/[ \t]+/)) {
				if (token === "logdone") policy = { ...policy, done: "time" }
				if (token === "nologdone") policy = { ...policy, done: "none" }
				if (token === "lognotedone") policy = { ...policy, done: "note" }
				if (token === "logdrawer") policy = { ...policy, drawer: "LOGBOOK" }
				if (token === "nologdrawer") policy = { ...policy, drawer: null }
			}
			provenance.push({
				from: line.from,
				headingFrom: null,
				tier: "file-options",
				to: line.breakTo,
			})
		}
	}
	if (
		declared.length &&
		(declared.length !== configured.length || declared.some((state) => !configured.includes(state)))
	)
		return reject("ambiguous-todo-scope")
	const compatibility = eligible.filter((line) => /^#\+LOG_INTO_DRAWER:/i.test(line.text))
	if (compatibility.length > 1) return reject("ambiguous-log-drawer-directive")
	if (compatibility[0]) {
		const line = compatibility[0]
		const drawer = parseOrgLogDrawerName(line.text.replace(/^#\+LOG_INTO_DRAWER:/i, ""))
		if (drawer === undefined) return reject("unsafe-log-drawer")
		policy = { ...policy, drawer }
		provenance.push({ from: line.from, headingFrom: null, tier: "file-options", to: line.breakTo })
	}
	const snapshot = snapshotOrgLoggingScopes(source, target.from, new Set(configured))
	if (snapshot.kind === "rejected") return snapshot
	for (const scope of snapshot.scopes) {
		for (const key of ["LOGGING", "LOG_INTO_DRAWER"] as const) {
			const declarations = scope.declarations.filter((declaration) => declaration.key === key)
			if (declarations.filter((declaration) => !declaration.append).length > 1)
				return reject(
					key === "LOGGING" ? "ambiguous-logging-property" : "ambiguous-log-drawer-property",
				)
			if (key === "LOG_INTO_DRAWER") {
				if (declarations.some((declaration) => declaration.append))
					return reject("unsupported-log-drawer-append")
				const declaration = declarations[0]
				if (declaration?.value.trim()) {
					const drawer = parseOrgLogDrawerName(declaration.value)
					if (drawer === undefined) return reject("unsafe-log-drawer")
					policy = { ...policy, drawer }
				}
			} else {
				const tokens = declarations.flatMap((declaration) =>
					declaration.value
						.trim()
						.split(/[ \t]+/)
						.filter(Boolean),
				)
				if (tokens.some((token) => /^nil$/i.test(token))) {
					if (tokens.length !== 1) return reject("ambiguous-logging-nil")
					policy = {
						done: "none",
						drawer: null,
						states: policy.states.map((state) => ({ ...state, incoming: "", outgoing: "" })),
					}
				} else
					for (const token of tokens) {
						const option = token.toLowerCase()
						if (option === "logdone") policy = { ...policy, done: "time" }
						else if (option === "nologdone") policy = { ...policy, done: "none" }
						else if (option === "lognotedone") policy = { ...policy, done: "note" }
						else if (option === "logdrawer") policy = { ...policy, drawer: "LOGBOOK" }
						else if (option === "nologdrawer") policy = { ...policy, drawer: null }
						else {
							const match = stateToken.exec(token)
							if (!match || !token.includes("(") || !configured.includes(match[1]) || match[2])
								return reject("unsupported-logging-policy")
							policy = {
								...policy,
								states: policy.states.map((state) =>
									state.state === match[1]
										? { incoming: match[3] ?? "", outgoing: match[4] ?? "", state: state.state }
										: state,
								),
							}
						}
					}
			}
			provenance.push(
				...declarations.map((declaration: OrgLoggingDeclaration) => ({
					from: declaration.from,
					headingFrom: scope.headingFrom,
					tier:
						scope.headingFrom === null
							? ("file-properties" as const)
							: ("heading-properties" as const),
					to: declaration.to,
				})),
			)
		}
	}
	return { kind: "policy", policy, provenance }
}
