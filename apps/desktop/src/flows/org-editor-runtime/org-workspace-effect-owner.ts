export type OrgWorkspaceEffectKind = "mutation" | "approval" | "save" | "save-close" | "save-all"
export type OrgWorkspaceEffectPresentation = "loading" | "saving"

interface OrgWorkspaceEffectPorts {
	readonly emitError: (message: string) => void
}

export interface OrgWorkspaceEffectClaim {
	readonly id: symbol
	readonly kind: OrgWorkspaceEffectKind
	readonly presentation: OrgWorkspaceEffectPresentation
	/** null is an exclusive workspace barrier; paths reserve files or directory subtrees. */
	readonly paths: readonly string[] | null
}

export interface OrgWorkspaceEffectSnapshot {
	readonly revision: number
	readonly busy: boolean
	readonly globalBusy: boolean
	readonly globalLoading: boolean
	readonly approving: boolean
	readonly saveAll: boolean
	readonly agendaBusy: boolean
	readonly loading: boolean
	readonly saving: boolean
	readonly claims: readonly OrgWorkspaceEffectClaim[]
	readonly reads: readonly { readonly id: symbol; readonly paths: readonly string[] | null; readonly channel: string }[]
	readonly agenda: symbol | null
}

export interface OrgWorkspaceFileEffectSnapshot {
	readonly revision: number
	readonly busy: boolean
	readonly loading: boolean
	readonly saving: boolean
	readonly saveInFlight: Promise<boolean> | null
	readonly capturedSaveContent: string | null
	readonly claim: symbol | null
	readonly kind: OrgWorkspaceEffectKind | null
}

export interface OrgWorkspaceEffectIntent {
	readonly label: string
	readonly kind?: OrgWorkspaceEffectKind
	readonly presentation?: OrgWorkspaceEffectPresentation
	readonly paths?: readonly string[]
}

export interface OrgWorkspaceReadLease {
	readonly isCurrent: () => boolean
	readonly finish: () => boolean
}

export interface OrgWorkspaceEffectOwner {
	readonly busy: boolean
	readonly approving: boolean
	readonly saveAll: boolean
	readonly agendaBusy: boolean
	readonly getSnapshot: () => OrgWorkspaceEffectSnapshot
	readonly getFileSnapshot: (relativePath: string) => OrgWorkspaceFileEffectSnapshot
	readonly subscribe: (listener: () => void) => () => void
	readonly owns: (owner: symbol) => boolean
	readonly begin: (intent: OrgWorkspaceEffectIntent) => symbol
	readonly beginRead: (label: string, paths?: readonly string[], channel?: string) => OrgWorkspaceReadLease
	readonly cancelRead: (channel?: string) => boolean
	readonly finish: (owner: symbol) => boolean
	readonly captureSave: (owner: symbol, settled: Promise<boolean>, content: string, relativePath: string) => boolean
	readonly captureBatch: (owner: symbol) => boolean
	readonly claimAgenda: (paths?: readonly string[]) => {
		readonly isCurrent: () => boolean
		readonly startRead: () => void
		readonly readIsCurrent: () => boolean
		readonly finishRead: () => boolean
		readonly release: () => void
	}
	readonly dispose: () => void
}

const reservePaths = (paths?: readonly string[]): readonly string[] | null =>
	paths?.length ? Object.freeze([...new Set(paths)]) : null
const touches = (paths: readonly string[] | null, path: string): boolean =>
	paths === null || paths.some((reserved) => reserved === path || path.startsWith(`${reserved}/`) || reserved.startsWith(`${path}/`))
const overlaps = (left: readonly string[] | null, right: readonly string[] | null): boolean =>
	left === null || right === null || right.some((path) => touches(left, path))

/** Disjoint file effects coexist. Workspace barriers and overlapping resources remain exclusive. */
export const createOrgWorkspaceEffectOwner = (ports: OrgWorkspaceEffectPorts): OrgWorkspaceEffectOwner => {
	const claims = new Map<symbol, {
		readonly descriptor: OrgWorkspaceEffectClaim
		save?: {
			readonly settled: Promise<boolean>
			readonly content: string | null
			readonly path: string | null
			readonly release?: () => void
		}
	}>()
	const reads = new Map<string, { readonly id: symbol; readonly paths: readonly string[] | null; readonly channel: string }>()
	const fileSnapshots = new Map<string, OrgWorkspaceFileEffectSnapshot>()
	let agenda: symbol | null = null
	const listeners = new Set<() => void>()
	let reporting = false
	let snapshot: OrgWorkspaceEffectSnapshot = Object.freeze({
		revision: 0, busy: false, globalBusy: false, globalLoading: false,
		approving: false, saveAll: false, agendaBusy: false, loading: false, saving: false,
		claims: Object.freeze([]), reads: Object.freeze([]), agenda: null,
	})
	const report = (error: unknown) => {
		if (reporting) return
		reporting = true
		try {
			ports.emitError(`Workspace effect observer failure: ${error instanceof Error ? error.message : String(error)}`)
		} catch {
			/* error delivery cannot unwind accepted ownership or waiter disposal */
		} finally {
			reporting = false
		}
	}
	const changed = () => {
		const descriptors = Object.freeze([...claims.values()].map((claim) => claim.descriptor))
		const readDescriptors = Object.freeze([...reads.values()])
		snapshot = Object.freeze({
			revision: snapshot.revision + 1,
			busy: claims.size !== 0,
			globalBusy: descriptors.some((claim) => claim.paths === null),
			globalLoading: descriptors.some((claim) => claim.paths === null && claim.presentation === "loading") ||
				readDescriptors.some((read) => read.paths === null),
			approving: descriptors.some((claim) => claim.kind === "approval"),
			saveAll: descriptors.some((claim) => claim.kind === "save-all"),
			agendaBusy: agenda !== null,
			loading: reads.size !== 0 || descriptors.some((claim) => claim.presentation === "loading"),
			saving: descriptors.some((claim) => claim.presentation === "saving"),
			claims: descriptors, reads: readDescriptors, agenda,
		})
		for (const listener of [...listeners]) {
			try { listener() } catch (error) { report(error) }
		}
	}
	const getFileSnapshot = (path: string): OrgWorkspaceFileEffectSnapshot => {
		const claim = [...claims.values()].find((value) => touches(value.descriptor.paths, path))
		const loading = claim?.descriptor.presentation === "loading" || [...reads.values()].some((value) => touches(value.paths, path))
		const saving = claim?.descriptor.presentation === "saving"
		const captured = claim?.save
		const save = captured && (captured.path === null || captured.path === path) ? captured : undefined
		const saveInFlight = save?.settled ?? null
		const capturedSaveContent = save?.content ?? null
		const id = claim?.descriptor.id ?? null
		const kind = claim?.descriptor.kind ?? null
		const previous = fileSnapshots.get(path)
		if (previous && previous.busy === !!claim && previous.loading === loading && previous.saving === saving &&
			previous.saveInFlight === saveInFlight && previous.capturedSaveContent === capturedSaveContent &&
			previous.claim === id && previous.kind === kind) return previous
		const next = Object.freeze({
			revision: (previous?.revision ?? -1) + 1,
			busy: !!claim, loading, saving, saveInFlight, capturedSaveContent, claim: id, kind,
		})
		fileSnapshots.set(path, next)
		return next
	}
	const owns = (owner: symbol) => claims.has(owner)
	const finish = (owner: symbol): boolean => {
		const claim = claims.get(owner)
		if (!claim) return false
		claims.delete(owner)
		try { changed() } finally { claim.save?.release?.() }
		return true
	}
	const canReserve = (paths: readonly string[] | null) =>
		![...claims.values()].some((claim) => overlaps(claim.descriptor.paths, paths))
	const retireReads = (paths: readonly string[] | null) => {
		for (const [channel, read] of reads) if (overlaps(paths, read.paths)) reads.delete(channel)
	}
	const begin = ({
		label, kind = "mutation", presentation = kind === "approval" ? "loading" : "saving", paths,
	}: OrgWorkspaceEffectIntent): symbol => {
		const reserved = reservePaths(paths)
		if (!canReserve(reserved)) {
			const predecessor = claims.size === 1 ? claims.values().next().value : undefined
			if (kind !== "approval" || reserved !== null || predecessor?.descriptor.kind !== "approval" ||
				predecessor.descriptor.paths !== null) throw new Error("A workspace file effect already owns the requested resources")
			claims.clear()
		}
		const owner = Symbol(label)
		claims.set(owner, { descriptor: Object.freeze({ id: owner, kind, presentation, paths: reserved }) })
		retireReads(reserved)
		changed()
		return owner
	}
	return {
		get busy() { return snapshot.busy },
		get approving() { return snapshot.approving },
		get saveAll() { return snapshot.saveAll },
		get agendaBusy() { return agenda !== null },
		getSnapshot: () => snapshot,
		getFileSnapshot,
		subscribe(listener) {
			listeners.add(listener)
			return () => { listeners.delete(listener) }
		},
		owns,
		begin,
		beginRead(label, paths, channel = "navigation") {
			const owner = Symbol(label)
			reads.set(channel, Object.freeze({ id: owner, paths: reservePaths(paths), channel }))
			changed()
			return {
				isCurrent: () => reads.get(channel)?.id === owner,
				finish: () => {
					if (reads.get(channel)?.id !== owner) return false
					reads.delete(channel)
					changed()
					return true
				},
			}
		},
		cancelRead(channel = "navigation") {
			if (!reads.delete(channel)) return false
			changed()
			return true
		},
		finish,
		captureSave(owner, settled, content, relativePath) {
			const claim = claims.get(owner)
			if (!claim || (claim.descriptor.kind !== "save" && claim.descriptor.kind !== "save-close") || claim.save ||
				!touches(claim.descriptor.paths, relativePath)) return false
			claim.save = { settled, content, path: relativePath }
			changed()
			return true
		},
		captureBatch(owner) {
			const claim = claims.get(owner)
			if (!claim || claim.descriptor.kind !== "save-all" || claim.save) return false
			const { promise: settled, resolve } = Promise.withResolvers<boolean>()
			claim.save = { settled, content: null, path: null, release: () => resolve(false) }
			changed()
			return true
		},
		claimAgenda(paths) {
			if (agenda !== null) claims.delete(agenda)
			const owner = Symbol("agendaCommand")
			const reserved = reservePaths(paths)
			agenda = owner
			changed()
			return {
				isCurrent: () => agenda === owner,
				startRead: () => {
					if (agenda !== owner || owns(owner) || !canReserve(reserved)) return
					claims.set(owner, { descriptor: Object.freeze({ id: owner, kind: "mutation", presentation: "loading", paths: reserved }) })
					retireReads(reserved)
					changed()
				},
				readIsCurrent: () => agenda === owner && owns(owner),
				finishRead: () => finish(owner),
				release: () => {
					const current = agenda === owner
					const claimed = claims.delete(owner)
					if (!current && !claimed) return
					if (current) agenda = null
					changed()
				},
			}
		},
		/** Revoke authority and publish idle state; the owner remains usable on StrictMode replay. */
		dispose() {
			if (!claims.size && !reads.size && agenda === null) return
			const waiters = [...claims.values()].map((claim) => claim.save?.release).filter((release) => release !== undefined)
			claims.clear()
			reads.clear()
			agenda = null
			try { changed() } finally { for (const release of waiters) release() }
		},
	}
}
