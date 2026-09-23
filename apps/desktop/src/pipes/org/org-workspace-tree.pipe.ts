import type { OrgDocumentEntryInterface, OrgTreeEntryInterface } from "@/types/org"

const parentPath = (path: string): string => {
	const separator = path.lastIndexOf("/")
	return separator === -1 ? "" : path.slice(0, separator)
}

const basename = (path: string): string => path.slice(path.lastIndexOf("/") + 1)

const appendToIndex = <Value>(index: Map<string, Value[]>, parent: string, value: Value): void => {
	const children = index.get(parent)
	if (children) {
		children.push(value)
	} else {
		index.set(parent, [value])
	}
}

/** Builds an immutable display tree from filesystem-relative directory and document paths. */
export const buildOrgWorkspaceTree = (
	directories: readonly string[],
	documents: readonly OrgDocumentEntryInterface[],
): readonly OrgTreeEntryInterface[] => {
	const directoriesByParent = new Map<string, string[]>()
	const documentsByParent = new Map<string, OrgDocumentEntryInterface[]>()
	for (const directory of directories) {
		appendToIndex(directoriesByParent, parentPath(directory), directory)
	}
	for (const document of documents) {
		appendToIndex(documentsByParent, parentPath(document.relativePath), document)
	}

	const buildChildren = (parent: string): readonly OrgTreeEntryInterface[] => {
		const childDirectories = (directoriesByParent.get(parent) ?? []).map((directory) => ({
			children: buildChildren(directory),
			name: basename(directory),
			relativePath: directory,
			type: "directory" as const,
		}))
		const childDocuments = (documentsByParent.get(parent) ?? []).map((document) => ({
			...document,
			name: basename(document.relativePath),
			type: "document" as const,
		}))

		return [...childDirectories, ...childDocuments].sort((left, right) => {
			if (left.type !== right.type) {
				return left.type === "directory" ? -1 : 1
			}
			return left.name.localeCompare(right.name)
		})
	}

	return buildChildren("")
}
