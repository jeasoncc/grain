import type { OrgDocumentInterface } from "@/types/org"
import type { OrgBufferIdentityScope } from "./org-buffer-identity-registry"

/** Source mirror and confirmed baseline only; never a writer or history owner. */
export interface OrgParkedWorkingCopy {
	readonly bufferId: string
	readonly document: OrgDocumentInterface
	readonly content: string
	readonly editGeneration: number
	readonly isDirty: boolean
}
export interface OrgParkedIdentityPort {
	lookup(scope: OrgBufferIdentityScope | null, path: string): string | undefined
	findPath(scope: OrgBufferIdentityScope | null, id: string): string | undefined
}
export type OrgParkedFailure = {
	readonly kind: "listener" | "reentrant"
	readonly error: unknown
}

export const createOrgParkedWorkingCopyReservoir = (
	identity: OrgParkedIdentityPort,
	onError: (failure: OrgParkedFailure) => void,
) => {
	let scope: OrgBufferIdentityScope | undefined
	const copies = new Map<string, OrgParkedWorkingCopy>()
	const listeners = new Set<() => void>()
	let notifying = false
	let reporting = false
	const emptyCopies: readonly OrgParkedWorkingCopy[] = Object.freeze([])
	let snapshot: { readonly revision: number; readonly copies: readonly OrgParkedWorkingCopy[] } =
		Object.freeze({ revision: 0, copies: emptyCopies })
	const matches = (candidate: OrgBufferIdentityScope | null) =>
		Boolean(
			candidate &&
				scope &&
				candidate.grant === scope.grant &&
				candidate.sessionId === scope.sessionId,
		)
	const report = (failure: OrgParkedFailure) => {
		// The explicit error port is observational too; it cannot unwind a committed mirror.
		if (reporting) return
		reporting = true
		try {
			onError(failure)
		} catch {
			/* error port owns its own delivery failures */
		} finally {
			reporting = false
		}
	}
	const writable = () => {
		if (!notifying) return true
		report({ kind: "reentrant", error: new Error("Parked mutation during notification") })
		return false
	}
	const changed = () => {
		snapshot = Object.freeze({
			revision: snapshot.revision + 1,
			copies: Object.freeze([...copies.values()]),
		})
		notifying = true
		try {
			for (const listener of [...listeners]) {
				try {
					listener()
				} catch (error) {
					report({ kind: "listener", error })
				}
			}
		} finally {
			notifying = false
		}
	}
	const readById = (candidate: OrgBufferIdentityScope | null, id: string) => {
		if (!matches(candidate)) return undefined
		const path = identity.findPath(candidate, id)
		const copy = path === undefined ? undefined : copies.get(path)
		return copy?.bufferId === id ? copy : undefined
	}
	const read = (candidate: OrgBufferIdentityScope | null, path: string) => {
		const id = identity.lookup(candidate, path)
		return id ? readById(candidate, id) : undefined
	}
	const store = (path: string, copy: OrgParkedWorkingCopy) => {
		const frozen = Object.freeze({ ...copy, document: Object.freeze({ ...copy.document }) })
		copies.set(path, frozen)
		changed()
		return frozen
	}
	return {
		/** Root owners also fence their own canonical/identity mutations during delivery. */
		canMutate: () => !notifying,
		getSnapshot: () => snapshot,
		subscribe(listener: () => void) {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		openScope(candidate: OrgBufferIdentityScope): boolean {
			if (!writable() || (scope && !matches(candidate))) return false
			scope = Object.freeze({ ...candidate })
			return true
		},
		read,
		readById,
		list(candidate: OrgBufferIdentityScope | null): readonly OrgParkedWorkingCopy[] {
			return matches(candidate) ? snapshot.copies : emptyCopies
		},
		park(
			candidate: OrgBufferIdentityScope | null,
			id: string,
			copy: Omit<OrgParkedWorkingCopy, "bufferId">,
		) {
			if (
				!writable() ||
				!matches(candidate) ||
				identity.lookup(candidate, copy.document.relativePath) !== id
			)
				return undefined
			return store(copy.document.relativePath, { ...copy, bufferId: id })
		},
		mirrorReplacement(
			candidate: OrgBufferIdentityScope | null,
			id: string,
			receipt: { readonly previous: string; readonly source: string },
		) {
			if (!writable()) return undefined
			const copy = readById(candidate, id)
			if (!copy || copy.content !== receipt.previous) return undefined
			return store(copy.document.relativePath, {
				...copy,
				content: receipt.source,
				editGeneration: copy.editGeneration + 1,
				isDirty: receipt.source !== copy.document.content,
			})
		},
		/** Caller supplies the pure ACK/reconciliation decision. No policy is inferred here. */
		installConfirmedBaseline(
			candidate: OrgBufferIdentityScope | null,
			id: string,
			expected: OrgParkedWorkingCopy,
			plan: {
				readonly document: OrgDocumentInterface
				readonly isDirty: boolean
				readonly content?: string
			},
		) {
			if (
				!writable() ||
				readById(candidate, id) !== expected ||
				plan.document.relativePath !== expected.document.relativePath
			)
				return undefined
			return store(expected.document.relativePath, {
				...expected,
				document: plan.document,
				isDirty: plan.isDirty,
				content: plan.content ?? expected.content,
				bufferId: id,
			})
		},
		takeToActivate(candidate: OrgBufferIdentityScope | null, id: string) {
			if (!writable()) return undefined
			const copy = readById(candidate, id)
			if (!copy) return undefined
			copies.delete(copy.document.relativePath)
			changed()
			return copy
		},
		retire(candidate: OrgBufferIdentityScope | null, id: string): boolean {
			if (!writable()) return false
			const copy = readById(candidate, id)
			if (!copy) return false
			copies.delete(copy.document.relativePath)
			changed()
			return true
		},
		renameApproved(
			candidate: OrgBufferIdentityScope | null,
			id: string,
			previousPath: string,
			document: OrgDocumentInterface,
		): boolean {
			if (
				!writable() ||
				!matches(candidate) ||
				identity.lookup(candidate, document.relativePath) !== id
			)
				return false
			const copy = copies.get(previousPath)
			if (!copy || copy.bufferId !== id || copies.has(document.relativePath)) return false
			copies.delete(previousPath)
			store(document.relativePath, { ...copy, document })
			return true
		},
		clearScope(candidate: OrgBufferIdentityScope | null): boolean {
			if (!writable() || !matches(candidate)) return false
			copies.clear()
			scope = undefined
			changed()
			return true
		},
	}
}
