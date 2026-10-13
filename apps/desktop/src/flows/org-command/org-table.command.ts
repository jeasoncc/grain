import type { OrgTableOperation } from "@/pipes/org/org-table.pipe"

/** Nonexecuting table operations. Recalculation belongs to the consent/review tool. */
export const orgTableCommandDefinitions = [
	{ id: "table-align", label: "Align Org table", operation: { kind: "align" } },
	{ id: "table-insert-row-above", label: "Insert table row above", operation: { kind: "insert-row", direction: -1 } },
	{ id: "table-insert-row-below", label: "Insert table row below", operation: { kind: "insert-row", direction: 1 } },
	{ id: "table-delete-row", label: "Delete table row", operation: { kind: "delete-row" } },
	{ id: "table-move-row-up", label: "Move table row up", operation: { kind: "move-row", direction: -1 } },
	{ id: "table-move-row-down", label: "Move table row down", operation: { kind: "move-row", direction: 1 } },
	{ id: "table-insert-column-left", label: "Insert table column left", operation: { kind: "insert-column", direction: -1 } },
	{ id: "table-insert-column-right", label: "Insert table column right", operation: { kind: "insert-column", direction: 1 } },
	{ id: "table-delete-column", label: "Delete table column", operation: { kind: "delete-column" } },
	{ id: "table-move-column-left", label: "Move table column left", operation: { kind: "move-column", direction: -1 } },
	{ id: "table-move-column-right", label: "Move table column right", operation: { kind: "move-column", direction: 1 } },
	{ id: "table-transpose", label: "Transpose Org table", operation: { kind: "transpose" } },
] as const satisfies readonly { readonly id: string; readonly label: string; readonly operation: OrgTableOperation }[]
