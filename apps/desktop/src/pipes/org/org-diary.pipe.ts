import { orgLocalCalendar } from "./org-local-calendar.pipe"
import type { OrgFreshDocumentPlan } from "@/types/org/org-fresh-document.types"

export interface OrgDiaryPlan extends OrgFreshDocumentPlan {}

export type OrgDiaryOutcome =
	| { readonly kind: "created"; readonly relativePath: string }
	| { readonly kind: "created-unopened"; readonly relativePath: string; readonly message: string }
	| { readonly kind: "no-workspace" | "busy" | "rejected" | "uncertain" | "stale"; readonly message: string }

/** Doom's Gregorian zodiac and local calendar, from one already-captured instant. */
export const planOrgDiary = (date: Date, id: string): OrgDiaryPlan => {
	const { directory, dateText, dateTime, time, epochSeconds } = orgLocalCalendar(date)
	return {
		directory,
		filenameStem: `diary-${epochSeconds}-${time.replaceAll(":", "-")}`,
		content: `:PROPERTIES:\n:ID:       ${id}\n:END:\n#+TITLE: 日记 ${dateTime}\n#+DATE: ${dateText}\n#+TIME: ${dateTime}\n#+FILETAGS: :diary:\n#+LATEX_CLASS: elegant-book\n#+OPTIONS: num:nil toc:nil ^:nil\n\n* 今日记录\n\n`,
	}
}
