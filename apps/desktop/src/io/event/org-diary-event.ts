export const CREATE_ORG_DIARY_EVENT = "grain:create-org-diary" as const

export const requestOrgDiaryCreation = (): void => {
	window.dispatchEvent(new Event(CREATE_ORG_DIARY_EVENT))
}

export const listenForOrgDiaryCreation = (handler: () => void): (() => void) => {
	window.addEventListener(CREATE_ORG_DIARY_EVENT, handler)
	return () => window.removeEventListener(CREATE_ORG_DIARY_EVENT, handler)
}
