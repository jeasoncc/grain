/** Exact approved grant identity, not a filesystem root label. */
export interface OrgBufferIdentityScope {
	readonly sessionId: string
	readonly grant: object
}

/** Owns logical identities only. Source, history, IO and authorization stay outside. */
export const createOrgBufferIdentityRegistry = () => {
	let scope: OrgBufferIdentityScope | undefined
	let sequence = 0
	const identities = new Map<string, string>()
	const matches = (candidate: OrgBufferIdentityScope | null) =>
		Boolean(
			candidate &&
				scope &&
				candidate.sessionId === scope.sessionId &&
				candidate.grant === scope.grant,
		)
	const lookup = (candidate: OrgBufferIdentityScope | null, path: string) =>
		matches(candidate) ? identities.get(path) : undefined
	return {
		openScope(candidate: OrgBufferIdentityScope): void {
			if (!candidate.sessionId || (scope && !matches(candidate)))
				throw new Error("Buffer identity scope is not available")
			scope = Object.freeze({ ...candidate })
		},
		ensure(candidate: OrgBufferIdentityScope | null, path: string): string {
			if (!candidate || !matches(candidate)) throw new Error("Stale buffer identity scope")
			let id = identities.get(path)
			if (!id) {
				id = `${candidate.sessionId}:buffer-${++sequence}`
				identities.set(path, id)
			}
			return id
		},
		lookup,
		findPath(candidate: OrgBufferIdentityScope | null, bufferId: string): string | undefined {
			if (!matches(candidate)) return undefined
			for (const [path, id] of identities) if (id === bufferId) return path
			return undefined
		},
		/** Caller has already approved the filesystem move. Reject changed mappings. */
		moveApproved(
			candidate: OrgBufferIdentityScope | null,
			source: string,
			destination: string,
			bufferId: string,
		): boolean {
			if (!matches(candidate) || identities.get(source) !== bufferId) return false
			if (source === destination) return true
			if (identities.has(destination)) return false
			identities.delete(source)
			identities.set(destination, bufferId)
			return true
		},
		retire(candidate: OrgBufferIdentityScope | null, path: string): string | undefined {
			const id = lookup(candidate, path)
			if (id) identities.delete(path)
			return id
		},
		clearScope(candidate: OrgBufferIdentityScope | null): boolean {
			if (!matches(candidate)) return false
			identities.clear()
			scope = undefined
			// Allocation sequence deliberately survives retirement and grant replacement.
			return true
		},
		snapshot(candidate: OrgBufferIdentityScope | null): readonly (readonly [string, string])[] {
			return Object.freeze(
				matches(candidate)
					? [...identities].map(([path, id]) => Object.freeze([path, id] as const))
					: [],
			)
		},
	}
}
