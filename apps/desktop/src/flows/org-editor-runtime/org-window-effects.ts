import type {
	Compartment,
	Extension,
	SelectionRange,
	StateEffect,
	StateEffectType,
} from "@codemirror/state"
import { EditorView } from "@codemirror/view"

export interface OrgWindowEffectContributor {
	readonly localEffect: <T>(effect: StateEffect<T>) => StateEffect<T>
	readonly reconfigure: (compartment: Compartment, content: Extension) => StateEffect<unknown>
	readonly revoke: () => void
}

/** Public-API provenance registry, scoped to ONE window. No private CM effect
 * types or payload inspection. Pass knownEffect as attachWindow.knownReconfigure.
 * Root reconfiguration remains forbidden and projected states are revalidated. */
export function createOrgWindowEffectRegistry(
	compartments: readonly Compartment[] = [],
	localTypes: readonly StateEffectType<unknown>[] = [],
) {
	const registered = new Set(compartments)
	const issued = new WeakSet<StateEffect<unknown>>()
	const contributors = new WeakMap<StateEffect<unknown>, { live: boolean }>()
	const remember = <T>(effect: StateEffect<T>): StateEffect<T> => {
		issued.add(effect)
		return effect
	}
	return {
		knownEffect: (effect: StateEffect<unknown>): boolean => issued.has(effect) || contributors.get(effect)?.live === true,
		/** Host-approved subsets only. Issuance is exact-instance, window- and contributor-local. */
		createContributor(
			types: readonly StateEffectType<unknown>[],
			ownedCompartments: readonly Compartment[] = [],
		): OrgWindowEffectContributor {
			if (types.some((type) => !localTypes.includes(type)) || ownedCompartments.some((compartment) => !registered.has(compartment)))
				throw new Error("Unregistered contributor window authority")
			const owner = { live: true }
			const allowedTypes = new Set(types)
			const allowedCompartments = new Set(ownedCompartments)
			const issue = <T>(effect: StateEffect<T>) => {
				if (!owner.live || issued.has(effect) || contributors.has(effect)) throw new Error("Retired or already-owned window effect")
				contributors.set(effect, owner)
				return effect
			}
			return Object.freeze({
				localEffect<T>(effect: StateEffect<T>): StateEffect<T> {
					for (const type of allowedTypes) if (effect.is(type)) return issue(effect)
					throw new Error("Unregistered contributor local effect")
				},
				reconfigure(compartment: Compartment, content: Extension): StateEffect<unknown> {
					if (!allowedCompartments.has(compartment)) throw new Error("Unregistered contributor compartment")
					return issue(compartment.reconfigure(content))
				},
				revoke: () => { owner.live = false },
			})
		},
		/** Admit an explicitly issued window-local presentation effect. */
		localEffect<T>(effect: StateEffect<T>): StateEffect<T> {
			if (contributors.has(effect)) throw new Error("Window effect belongs to a contributor")
			if (!localTypes.some((type) => effect.is(type))) {
				throw new Error("Unregistered window-local effect")
			}
			return remember(effect)
		},
		reconfigure(compartment: Compartment, content: Extension): StateEffect<unknown> {
			if (!registered.has(compartment)) {
				throw new Error("Unregistered window compartment")
			}
			return remember(compartment.reconfigure(content))
		},
		scrollIntoView(
			position: number | SelectionRange,
			options?: Parameters<typeof EditorView.scrollIntoView>[1],
		): StateEffect<unknown> {
			return remember(EditorView.scrollIntoView(position, options))
		},
		scrollSnapshot(view: EditorView): StateEffect<unknown> {
			return remember(view.scrollSnapshot())
		},
	}
}
