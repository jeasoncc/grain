import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION, orgInheritsName, type OrgInheritanceConfiguration, type OrgLoggingPreferences } from "./org-behavior-configuration.pipe"
import { type OrgLoggingDeclaration, snapshotOrgLoggingScopes } from "./org-logging-scope.pipe"
import { eligibleOrgSourceLines, parseOrgTodoKeywords } from "./org-text.pipe"

export interface OrgStateLogging {
	readonly state: string
	readonly incoming: string
	readonly outgoing: string
}
export type OrgLogMode = "none" | "time" | "note"
export interface OrgLoggingPolicy {
	readonly states: readonly OrgStateLogging[]
	readonly done: OrgLogMode
	readonly repeat: OrgLogMode
	readonly reschedule: OrgLogMode
	readonly redeadline: OrgLogMode
	readonly refile: OrgLogMode
	readonly reversed: boolean
	readonly repeatToState: string | null
	readonly drawer: string | null
}
export interface OrgLoggingPolicyOptions {
	readonly inheritance?: OrgInheritanceConfiguration
	readonly logging?: Partial<OrgLoggingPreferences>
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
 * Org's nonempty LOGGING property replaces only state/done/repeat preferences.
 * Operation logging remains a global/file STARTUP preference. Empty local
 * properties inherit; LOG_INTO_DRAWER inherits independently of LOGGING.
 * See https://orgmode.org/manual/Tracking-TODO-state-changes.html and
 * https://orgmode.org/manual/Repeated-tasks.html.
 */
export const resolveOrgLoggingPolicy = (
	source: string,
	target: { readonly from: number },
	options: OrgLoggingPolicyOptions = {},
): OrgLoggingPolicyResult => {
	const keywords = parseOrgTodoKeywords(source)
	const configured = [...keywords.todo, ...keywords.done]
	const eligible = eligibleOrgSourceLines(source, new Set(configured))
	const clearLogging = (current: OrgLoggingPolicy): OrgLoggingPolicy => ({
		...current,
		done: "none",
		repeat: "none",
		states: current.states.map((state) => ({ ...state, incoming: "", outgoing: "" })),
	})
	const applyOption = (current: OrgLoggingPolicy, token: string): OrgLoggingPolicy | null => {
		const option = token.toLowerCase()
		for (const key of ["done", "repeat", "reschedule", "redeadline", "refile"] as const) {
			if (option === `log${key}`) return { ...current, [key]: "time" }
			if (option === `lognote${key}`) return { ...current, [key]: "note" }
			if (option === `nolog${key}`) return { ...current, [key]: "none" }
		}
		if (option === "logdrawer") return { ...current, drawer: "LOGBOOK" }
		if (option === "nologdrawer") return { ...current, drawer: null }
		if (option === "logstatesreversed") return { ...current, reversed: true }
		if (option === "nologstatesreversed") return { ...current, reversed: false }
		return null
	}
	let policy: OrgLoggingPolicy = {
		done: options.logging?.done ?? "none",
		repeat: options.logging?.repeat ?? "time",
		reschedule: options.logging?.reschedule ?? "none",
		redeadline: options.logging?.redeadline ?? "none",
		refile: options.logging?.refile ?? "none",
		reversed: true,
		repeatToState: null,
		drawer: null,
		states: configured.map((state) => ({ incoming: "", outgoing: "", state })),
	}
	let explicitDrawer: string | null | undefined
	let inheritedLogging: string[] = []
	const provenance: OrgLoggingProvenance[] = []
	const declared: string[] = []
	for (const line of eligible) {
		if (/^#\+(?:TODO|SEQ_TODO|TYP_TODO):/i.test(line.text)) {
			const value = line.text.replace(/^#\+(?:TODO|SEQ_TODO|TYP_TODO):[ \t]*/i, "").trim()
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
				policy = applyOption(policy, token) ?? policy
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
		for (const key of ["LOGGING", "LOG_INTO_DRAWER", "REPEAT_TO_STATE"] as const) {
			const declarations = scope.declarations.filter((declaration) => declaration.key === key)
			if (declarations.filter((declaration) => !declaration.append).length > 1)
				return reject(
					key === "LOGGING" ? "ambiguous-logging-property" : key === "REPEAT_TO_STATE" ? "ambiguous-repeat-state" : "ambiguous-log-drawer-property",
				)
			if (key === "REPEAT_TO_STATE") {
				if (declarations.some((declaration) => declaration.append))
					return reject("unsupported-repeat-state-append")
				const inheritance = options.inheritance ?? DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance
				if (scope.headingFrom === null || scope.headingFrom === target.from ||
					orgInheritsName(inheritance.properties, inheritance.propertyExclusions, "REPEAT_TO_STATE", "property")) {
					const state = declarations[0]?.value.trim()
					if (state) policy = { ...policy, repeatToState: state === "nil" ? null : state }
				}
			} else if (key === "LOG_INTO_DRAWER") {
				if (declarations.some((declaration) => declaration.append))
					return reject("unsupported-log-drawer-append")
				const declaration = declarations[0]
				if (declaration?.value.trim()) {
					const drawer = parseOrgLogDrawerName(declaration.value)
					if (drawer === undefined) return reject("unsafe-log-drawer")
					explicitDrawer = drawer
				}
			} else {
				const localTokens = declarations.flatMap((declaration) =>
					declaration.value
						.trim()
						.split(/[ \t]+/)
						.filter(Boolean),
				)
				const replaces = declarations.some((declaration) => !declaration.append && declaration.value.trim())
				const tokens = replaces ? localTokens : [...inheritedLogging, ...localTokens]
				if (localTokens.length) inheritedLogging = tokens
				if (localTokens.length) policy = clearLogging(policy)
				for (const token of localTokens.length ? tokens : []) {
					// GNU ignores unknown words, nil and operation/drawer STARTUP words.
					const option = /^(?:nolog|lognote|log)(?:done|repeat)$/i.test(token)
						? applyOption(policy, token) : null
					if (option) policy = option
					else {
						const match = stateToken.exec(token)
						if (!match || !token.includes("(") || !configured.includes(match[1]) || match[2]) continue
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
	if (explicitDrawer !== undefined) policy = { ...policy, drawer: explicitDrawer }
	return { kind: "policy", policy, provenance }
}
