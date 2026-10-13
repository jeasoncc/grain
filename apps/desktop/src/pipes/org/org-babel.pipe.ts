import { eligibleOrgBlockRanges, eligibleOrgSourceLines, parseOrgTodoKeywords, type OrgTextEditBatch } from "./org-text.pipe"
import { maskOrgInlineCode } from "./org-default-syntax.pipe"

export interface OrgBabelInvocationRange {
	readonly from: number
	readonly to: number
}
export type OrgExecutionSourceKind = "block" | "inline" | "call" | "table"
export type OrgBabelSelection = { readonly kind: OrgExecutionSourceKind; readonly range: OrgBabelInvocationRange } | { readonly kind: "unavailable"; readonly message: string }

/** Balanced raw coordinates only; GNU Org interprets language, headers and body. */
const orgBabelDelimitedEnd = (source: string, from: number, open: string, close: string): number => {
	if (source[from] !== open) return -1
	let depth = 1
	for (let index = from + 1; index < source.length; index++) {
		if (source[index] === "\\") { index++; continue }
		if (source[index] === open) depth++
		if (source[index] === close && --depth === 0) return index + 1
	}
	return -1
}

/** Raw inline invocation boundaries only; never evaluates arguments or headers. */
export function orgInlineBabelInvocationAt(source: string, from: number) {
	const prefix = /^(src|call)_([^ \t\r\n[({]+)(?=[\[({])/u.exec(source.slice(from))
	if (!prefix) return null
	let body = from + prefix[0].length
	if (source[body] === "[") body = orgBabelDelimitedEnd(source, body, "[", "]")
	if (body < 0) return null
	const kind = prefix[1] === "src" ? "inline" as const : "call" as const
	const bodyTo = orgBabelDelimitedEnd(source, body, kind === "inline" ? "{" : "(", kind === "inline" ? "}" : ")")
	if (bodyTo < 0) return null
	const to = kind === "call" && source[bodyTo] === "[" ? orgBabelDelimitedEnd(source, bodyTo, "[", "]") : bodyTo
	return to < 0 ? null : { kind, from, to, bodyFrom: body + 1, bodyTo: bodyTo - 1, name: prefix[2] }
}

export function selectOrgBabelInvocation(source: string, cursor: number): OrgBabelSelection {
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length) return { kind: "unavailable", message: "Invalid source cursor." }
	const keywords = parseOrgTodoKeywords(source)
	const states = new Set([...keywords.todo, ...keywords.done])
	const range = eligibleOrgBlockRanges(source, states).find((candidate) => cursor >= candidate.from && cursor < candidate.to)
	if (range) {
		if (!range.closed) return { kind: "unavailable", message: "Select a complete source block outside drawers and COMMENT subtrees." }
		const raw = source.slice(range.from, range.to)
		const begin = /^[ \t]*#\+begin_src[ \t]+([A-Za-z0-9_-]+)([^\r\n]*)(\r\n|\r|\n)/i.exec(raw)
		const end = begin && /^[ \t]*#\+end_src[ \t]*(?:\r\n|\r|\n|$)/im.exec(raw.slice(begin[0].length))
		if (!begin || !end || end.index + begin[0].length + end[0].length !== raw.length) return { kind: "unavailable", message: "Select a complete #+begin_src block with a language." }
		return { kind: "block", range: Object.freeze({ from: range.from, to: range.to }) }
	}
	const lines = eligibleOrgSourceLines(source, states)
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]
		if (/^[ \t]*#\+CALL:[ \t]*\S/i.test(line.text) && cursor >= line.from && cursor <= line.contentTo) {
			return { kind: "call", range: Object.freeze({ from: line.from, to: line.contentTo }) }
		}
		if (!line.text.trim() || /^[ \t]*(?:#\+|:|\|)/.test(line.text)) continue
		let end = index
		while (end + 1 < lines.length && lines[end].breakTo === lines[end + 1].from
			&& lines[end + 1].text.trim() && !/^(?:\*+[ \t]|[ \t]*(?:#\+|:|\|))/.test(lines[end + 1].text)) end++
		const raw = source.slice(line.from, lines[end].contentTo)
		const masked = maskOrgInlineCode(raw)
		for (const match of masked.matchAll(/(?<![\p{L}\p{N}_])(?:src|call)_[^ \t\r\n[({]+(?=[\[({])/gu)) {
			const inline = orgInlineBabelInvocationAt(raw, match.index)
			if (!inline) continue
			const from = line.from + inline.from
			const to = line.from + inline.to
			if (cursor >= from && cursor <= to) return { kind: inline.kind, range: Object.freeze({ from, to }) }
		}
		index = end
	}
	return { kind: "unavailable", message: "Select a complete source block, inline src expression, or #+CALL outside protected Org content." }
}

/** Exact eligible rows only; formulas are disclosed input, never result-owned output. */
export function selectOrgTableExecution(source: string, cursor: number): OrgBabelSelection {
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length) return { kind: "unavailable", message: "Invalid source cursor." }
	const keywords = parseOrgTodoKeywords(source)
	const lines = eligibleOrgSourceLines(source, new Set([...keywords.todo, ...keywords.done]))
	let index = lines.findIndex((line) => cursor >= line.from && cursor <= line.contentTo)
	if (index < 0) return { kind: "unavailable", message: "Select a table outside protected Org content." }
	while (index > 0 && /^[ \t]*#\+TBLFM:/i.test(lines[index].text) && lines[index - 1].breakTo === lines[index].from) index--
	if (!/^[ \t]*\|/.test(lines[index].text)) return { kind: "unavailable", message: "Select an Org table or its adjacent #+TBLFM formula." }
	let first = index
	let last = index
	while (first > 0 && lines[first - 1].breakTo === lines[first].from && /^[ \t]*\|/.test(lines[first - 1].text)) first--
	while (last + 1 < lines.length && lines[last].breakTo === lines[last + 1].from && /^[ \t]*\|/.test(lines[last + 1].text)) last++
	return { kind: "table", range: Object.freeze({ from: lines[first].from, to: lines[last].breakTo }) }
}

export interface OrgBabelFrame {
	readonly kind: "results" | "no-results"
	/** Zero-based Unicode scalar coordinates in GNU's LF-normalized input. */
	readonly from: number
	readonly to: number
	readonly removed: string
	readonly insert: string
}
const invalidUnicode = (text: string) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text)

/** Entire stdout must be one nonce-bound, flat JSON receipt, not process chatter. */
export function parseOrgBabelFrame(bytes: Uint8Array, nonce: string): OrgBabelFrame {
	const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes)
	// Mask complete string tokens before counting keys: raw Org may itself contain JSON.
	const masked = text.replace(/"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/g, '""')
	if ((masked.match(/""\s*:/g)?.length ?? 0) !== 7) throw new Error("Duplicate or malformed Babel frame fields.")
	const value: unknown = JSON.parse(text)
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Babel result frame.")
	const frame = value as Record<string, unknown>
	if (Object.keys(frame).sort().join(",") !== "from,insert,kind,nonce,protocol,removed,to"
		|| frame.protocol !== "grain-org-babel/2" || frame.nonce !== nonce
		|| (frame.kind !== "results" && frame.kind !== "no-results")
		|| !Number.isSafeInteger(frame.from) || !Number.isSafeInteger(frame.to)
		|| typeof frame.from !== "number" || typeof frame.to !== "number" || frame.from < 0 || frame.to < frame.from
		|| typeof frame.removed !== "string" || typeof frame.insert !== "string"
		|| invalidUnicode(frame.removed) || invalidUnicode(frame.insert)
		|| (frame.kind === "no-results" && (frame.from !== 0 || frame.to !== 0 || frame.removed !== "" || frame.insert !== ""))
		|| (frame.kind === "results" && frame.removed === frame.insert)) throw new Error("Invalid Babel result frame.")
	return { kind: frame.kind, from: frame.from, to: frame.to, removed: frame.removed, insert: frame.insert }
}

/** Map only the GNU-owned minimal edit; never normalize the captured body or infer result syntax. */
export function planOrgBabelResults(source: string, range: OrgBabelInvocationRange, frame: OrgBabelFrame, cursor: number, sourceKind: OrgExecutionSourceKind): OrgTextEditBatch {
	if (frame.kind !== "results") throw new Error("No GNU result edit to apply.")
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length) throw new Error("Invalid captured source cursor.")
	let scalar = 0
	let offset = 0
	let from = -1
	let to = -1
	while (true) {
		if (scalar === frame.from) from = offset
		if (scalar === frame.to) { to = offset; break }
		if (offset === source.length) break
		const code = source.charCodeAt(offset++)
		if (code === 13 && source.charCodeAt(offset) === 10) offset++
		else if (code >= 0xd800 && code <= 0xdbff && source.charCodeAt(offset) >= 0xdc00 && source.charCodeAt(offset) <= 0xdfff) offset++
		scalar++
	}
	if (from < 0 || to < 0 || source.slice(from, to).replace(/\r\n|\r/g, "\n") !== frame.removed) throw new Error("GNU result edit does not match the captured source.")
	if (sourceKind === "table") {
		if (from < range.from || to > range.to) throw new Error("GNU table calculation would change source outside selected rows.")
	} else if ((from < range.to && to > range.from) || (from === to && from >= range.from && from < range.to)) throw new Error("GNU result edit would change the selected invocation.")
	const removedTail = frame.removed.charCodeAt(frame.removed.length - 1)
	const insertedTail = frame.insert.charCodeAt(frame.insert.length - 1)
	const removedLast = frame.removed.codePointAt(frame.removed.length - (removedTail >= 0xdc00 && removedTail <= 0xdfff ? 2 : 1))
	const insertedLast = frame.insert.codePointAt(frame.insert.length - (insertedTail >= 0xdc00 && insertedTail <= 0xdfff ? 2 : 1))
	if (frame.removed && frame.insert && (frame.removed.codePointAt(0) === frame.insert.codePointAt(0)
		|| removedLast === insertedLast)) throw new Error("GNU result edit is not minimal.")
	let insert = frame.insert
	if (sourceKind === "table") {
		const endings = source.slice(from, to).match(/\r\n|\r|\n/g) ?? []
		if ((insert.match(/\n/g)?.length ?? 0) !== endings.length) throw new Error("GNU calculation changed the selected table row structure.")
		let index = 0
		insert = insert.replace(/\n/g, () => endings[index++])
	}
	const mappedCursor = cursor <= from ? cursor : cursor >= to ? cursor + insert.length - (to - from) : from + insert.length
	return Object.freeze({ changes: Object.freeze([Object.freeze({ from, to, insert })]), cursor: mappedCursor,
		requiredVisibleRanges: Object.freeze([Object.freeze({ from: range.from, to: range.to }), Object.freeze({ from, to })]) })
}

/** Disclosed verbatim in argv. One JSON stdin line is data; Org headers/code retain executable authority. */
export const ORG_BABEL_EMACS_WRAPPER = `(progn
  (require 'json)
  (require 'org)
  (require 'ob)
  (require 'ob-lob)
  (require 'org-table)
  (require 'cl-lib)
  (setq coding-system-for-read 'utf-8-unix coding-system-for-write 'utf-8-unix)
  (let* ((payload (json-parse-string
                  (decode-coding-string (read-string "") 'utf-8-unix)
                  :object-type 'alist))
         (source (replace-regexp-in-string "\\r\\n?" "\\n" (alist-get 'source payload) t t))
         (position (alist-get 'position payload))
         (source-kind (alist-get 'sourceKind payload))
         (selection-end (alist-get 'selectionEnd payload))
         (path (alist-get 'path payload))
         (relative-path (alist-get 'relativePath payload))
         (directory default-directory)
         (nonce (alist-get 'nonce payload))
         (output standard-output)
         (log (generate-new-buffer " *grain-babel-log*"))
         (kind "no-results")
         (from 0) (to 0) (removed "") (inserted ""))
    (unwind-protect
        (with-temp-buffer
          (insert source)
          (setq buffer-file-name path)
          (setq default-directory (file-name-as-directory (expand-file-name (or (file-name-directory relative-path) "") directory)))
          (org-mode)
          (goto-char (1+ position))
          (let* ((standard-output log)
                 (org-confirm-babel-evaluate nil)
                 (context (org-element-context))
                 (info (unless (equal source-kind "table")
                         (if (equal source-kind "call")
                             (org-babel-lob-get-info context t)
                           (org-babel-get-src-block-info 'no-eval context))))
                 (language (car info))
                 (origin (current-buffer))
                 (before (buffer-string))
                 (insertion-before nil)
                 (insertion-after nil)
                 (insert-result (symbol-function 'org-babel-insert-result)))
            (unless (pcase source-kind
                      ("block" (eq (org-element-type context) 'src-block))
                      ("inline" (eq (org-element-type context) 'inline-src-block))
                      ("call" (memq (org-element-type context) '(babel-call inline-babel-call)))
                      ("table" (org-at-table-p)))
              (error "Selected invocation kind not recognized by GNU Org"))
            (if (equal source-kind "table")
                (progn
                  (unless (and (= (org-table-begin) (1+ position))
                               (= (org-table-end) (1+ selection-end)))
                    (error "Selected table bounds not recognized by GNU Org"))
                  (org-table-recalculate t)
                  (setq insertion-before before insertion-after (buffer-string))
                  (unless (and (equal (substring before 0 position)
                                      (substring insertion-after 0 position))
                               (string-suffix-p (substring before selection-end)
                                                insertion-after))
                    (error "Table calculation changed source outside selected rows")))
              (unless info (error "Selected invocation has no GNU Babel source information"))
              (dolist (lang (cons language
                                 (org-element-map (org-element-parse-buffer) '(src-block inline-src-block)
                                   (lambda (element) (org-element-property :language element)))))
                (let ((module (if (member lang '("sh" "bash" "ash" "dash" "ksh" "mksh" "posh" "zsh")) "shell" lang)))
                  (require (intern (concat "ob-" module)) nil t)))
              (unless (fboundp (intern (concat "org-babel-execute:" language)))
                (error "Selected Babel language is not installed: %s" language))
            ;; Only the selected GNU insertion may publish a body edit.  Dependency,
            ;; header, execution and after-execute buffer mutations are not results.
            (cl-letf (((symbol-function 'org-babel-insert-result)
                       (lambda (&rest args)
                         (if (and (eq (current-buffer) origin)
                                  (equal (nth 5 (nth 2 args)) (nth 5 info)))
                             (progn
                               (when insertion-before (error "Multiple selected result insertions"))
                               (setq insertion-before (buffer-string))
                               (prog1 (apply insert-result args)
                                 (setq insertion-after (buffer-string))))
                           (apply insert-result args)))))
              (if (equal source-kind "call")
                  (org-babel-lob-execute-maybe)
                (org-babel-execute-src-block nil nil nil (org-element-type context)))))
            (let ((after (buffer-string)))
              (unless (equal before after)
                (unless (and (equal before insertion-before) (equal after insertion-after))
                  (error "Buffer changed outside the selected GNU result insertion"))
                (let ((head 0) (tail 0))
                  (while (and (< head (length before)) (< head (length after))
                              (= (aref before head) (aref after head)))
                    (setq head (1+ head)))
                  (while (and (< tail (- (length before) head))
                              (< tail (- (length after) head))
                              (= (aref before (- (length before) tail 1))
                                 (aref after (- (length after) tail 1))))
                    (setq tail (1+ tail)))
                  (setq kind "results"
                        from head
                        to (- (length before) tail)
                        removed (substring before head to)
                        inserted (substring after head (- (length after) tail)))))))
          (with-current-buffer log
            (unless (= (buffer-size) 0)
              (princ (buffer-string) 'external-debugging-output)))
          (princ (decode-coding-string
                  (json-serialize (list :protocol "grain-org-babel/2" :nonce nonce :kind kind
                                        :from from :to to :removed removed :insert inserted))
                  'utf-8-unix) output))
      (kill-buffer log))))`
