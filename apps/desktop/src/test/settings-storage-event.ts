// jsdom validates StorageEventInit.storageArea against its native Storage,
// while this suite deliberately uses the shared deterministic TestStorage.
export const settingsStorageEvent = (newValue: string | null): StorageEvent => {
	const event = new StorageEvent("storage", { key: "grain-settings", newValue })
	Object.defineProperty(event, "storageArea", { value: localStorage })
	return event
}
