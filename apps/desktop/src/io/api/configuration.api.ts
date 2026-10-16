import { invoke } from "@tauri-apps/api/core"
import { z } from "zod"

const fileSchema = z.object({ path: z.string().min(1), content: z.string().nullable() }).strict()
export type ConfigurationFile = z.infer<typeof fileSchema>

/** Native IO always resolves the fixed app configuration path; callers never supply a path. */
export async function readConfigurationFile(): Promise<ConfigurationFile> {
	if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window || "__TAURI__" in window))
		throw new Error("Configuration files require the native desktop app. Browser previews do not save preferences.")
	return fileSchema.parse(await invoke<unknown>("read_configuration_file"))
}
export async function createConfigurationFile(content: string): Promise<ConfigurationFile> {
	return fileSchema.parse(await invoke<unknown>("create_configuration_file", { content }))
}
export async function openNativeConfigurationFile(): Promise<void> {
	await invoke("open_configuration_file")
}

/** A confined native event invalidates the file; event bodies never install preferences. */
export function listenConfigurationReload(reload: () => void): () => void {
	window.addEventListener("grain:configuration-reload", reload)
	return () => window.removeEventListener("grain:configuration-reload", reload)
}
export async function broadcastConfigurationReload(): Promise<void> {
	await invoke("notify_configuration_reload")
}
