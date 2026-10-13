// The pinned core package publishes main.d.ts referencing omitted dist/types.
// Its matching adapter ships the generated public engine and constructor types.
declare module "@replit/codemirror-vim-core" {
	export function initVim(
		constructor: typeof import("@replit/codemirror-vim").CodeMirror,
	): typeof import("@replit/codemirror-vim").Vim
}
