import type {
	Compartment,
	Extension,
	SelectionRange,
	StateEffect,
	StateEffectType,
} from "@codemirror/state"
import { EditorView } from "@codemirror/view"

/** Public-API provenance registry, scoped to ONE window. No private CM effect
 * types or payload inspection. Pass knownEffect as attachWindow.knownReconfigure.
 * Root reconfiguration remains forbidden and projected states are revalidated. */
export function createOrgWindowEffectRegistry(
	compartments: readonly Compartment[] = [],
	localTypes: readonly StateEffectType<unknown>[] = [],
) {
	const registered = new Set(compartments)
	const issued = new WeakSet<StateEffect<unknown>>()
	const remember = <T>(effect: StateEffect<T>): StateEffect<T> => {
		issued.add(effect)
		return effect
	}
	return {
		knownEffect: (effect: StateEffect<unknown>): boolean => issued.has(effect),
		/** Admit an explicitly issued window-local presentation effect. */
		localEffect<T>(effect: StateEffect<T>): StateEffect<T> {
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
