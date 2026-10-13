import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { resolveOrgCalendarKey } from "@/pipes/org/org-calendar-key.pipe"
import { isOrgRepeatedKeyEvent, retainOrgInputKeys } from "@/flows/org-command/org-prefix-keymap"
import {
	formatOrgTimestamp,
	isOrgCalendarISO,
	orgCalendarMonthDays,
	orgCalendarWeekday,
	readOrgDate,
	shiftOrgCalendarDate,
	type OrgCalendarUnit,
	type OrgDateContext,
	type OrgTimestampValue,
} from "@/pipes/org/org-date-reader.pipe"

export interface OrgCalendarReaderProps {
	readonly value: string
	readonly context: OrgDateContext
	readonly disabled?: boolean
	/** The parameter host may own the sole text input/focus/IME lifecycle. */
	readonly showInput?: boolean
	readonly onChange: (value: string) => void
	readonly onAccept: (value: string) => void
	readonly onCancel: () => void
	/** The shared host retains its sole input and delegates calendar navigation here. */
	readonly onKeyHandler?: (handler: ((event: KeyboardEvent) => boolean) | null) => void
}

/** Controlled values only; acceptance/source guards/history belong to the parameter host. */
export const OrgCalendarReader = ({ value, context, disabled = false, showInput = true, onChange, onAccept, onCancel, onKeyHandler }: OrgCalendarReaderProps) => {
	useLayoutEffect(() => retainOrgInputKeys(window), [])
	const parsed = readOrgDate(value, context)
	// A locally generated invalid detail remains editable, but is never accepted.
	// Arbitrary invalid host text cannot borrow a different valid timestamp.
	const detailDraft = useRef<OrgTimestampValue | null>(null)
	const stamp: OrgTimestampValue | null = parsed.kind === "date" ? parsed.timestamp ?? { date: parsed.date }
		: detailDraft.current && formatOrgTimestamp(detailDraft.current) === value ? detailDraft.current : null
	const selected = stamp?.date ?? context.defaultDate ?? context.today
	const validContext = isOrgCalendarISO(selected)
	const selectedMonth = validContext ? selected.slice(0, 7) : ""
	const [month, setMonth] = useState(selectedMonth)
	const composing = useRef(false)
	const calendar = useRef<HTMLElement>(null)
	const id = useId()
	useEffect(() => setMonth(selectedMonth), [selectedMonth])
	useEffect(() => {
		const active = document.activeElement
		if (active instanceof HTMLElement && active.dataset.calendarDay && calendar.current?.contains(active))
			calendar.current.querySelector<HTMLElement>(`[data-calendar-day="${selected}"]`)?.focus()
	}, [selected])
	const update = (patch: Partial<OrgTimestampValue>) => {
		if (!stamp || disabled) return
		detailDraft.current = { ...stamp, ...patch }
		onChange(formatOrgTimestamp(detailDraft.current))
	}
	const selectDate = (date: string, accept = false) => {
		if (disabled || !isOrgCalendarISO(date) || !stamp) return
		const next = stamp.endDate && stamp.endDate < date ? { ...stamp, date, endDate: date } : { ...stamp, date }
		// Date-only text stays date-only; explicit details are carried through the calendar.
		const input = parsed.kind === "date" && !parsed.timestamp ? date : formatOrgTimestamp(next)
		onChange(input)
		if (accept && readOrgDate(input, context).kind === "date" && !composing.current) onAccept(input)
	}
	const scrollMonth = (offset: number) => {
		const next = shiftOrgCalendarDate(`${month}-01`, offset, "m")
		if (next) setMonth(next.slice(0, 7))
	}
	const first = `${month}-01`
	const offset = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(orgCalendarWeekday(first))
	const count = orgCalendarMonthDays(Number(month.slice(0, 4)), Number(month.slice(5, 7)))
	const handleKey = (event: KeyboardEvent) => {
		if (composing.current || event.getModifierState("AltGraph")) return false
		const action = resolveOrgCalendarKey({
			key: event.key,
			ctrlKey: event.ctrlKey,
			metaKey: event.metaKey,
			altKey: event.altKey,
			shiftKey: event.shiftKey,
			repeat: isOrgRepeatedKeyEvent(event),
			defaultPrevented: event.defaultPrevented,
			isComposing: event.isComposing,
			keyCode: event.keyCode,
		}, {
			selected, month, today: context.today,
			gridDate: event.target instanceof HTMLElement ? event.target.dataset.calendarDay : undefined,
		})
		if (action.kind === "unhandled") return false
		event.preventDefault()
		if (disabled) return true
		if (action.kind === "cancel") onCancel()
		else if (action.kind === "accept" && parsed.kind === "date") onAccept(value)
		else if (action.kind === "select") selectDate(action.date)
		else if (action.kind === "month") setMonth(action.month)
		return true
	}
	useLayoutEffect(() => {
		onKeyHandler?.(handleKey)
		return () => onKeyHandler?.(null)
	}, [handleKey, onKeyHandler])
	return (
		<section
			ref={calendar}
			aria-label="Org calendar date reader"
			className="space-y-3 p-3"
			onCompositionStart={() => { composing.current = true }}
			onCompositionEnd={() => { composing.current = false }}
			onKeyDown={(event) => { if (handleKey(event.nativeEvent)) event.stopPropagation() }}
		>
			{showInput && <label className="block text-sm" htmlFor={`${id}-date`}>Date, time or range
				<input id={`${id}-date`} autoFocus className="mt-1 w-full rounded border p-2" value={value} disabled={disabled} aria-invalid={parsed.kind === "error"} onChange={(event) => onChange(event.target.value)} />
			</label>}
			<p aria-live="polite" role={parsed.kind === "error" ? "alert" : undefined} className="text-sm">
				{parsed.kind === "error" ? parsed.message : `${formatOrgTimestamp(parsed.timestamp ?? { date: parsed.date })}${parsed.forcedYear ? ` — Year forced from ${parsed.forcedYear.requested} to ${parsed.forcedYear.actual} by compatible-year policy.` : ""}${parsed.endForcedYear ? ` — Range end year forced from ${parsed.endForcedYear.requested} to ${parsed.endForcedYear.actual} by compatible-year policy.` : ""}`}
			</p>
			{validContext && month && <>
				<div className="flex items-center justify-between">
					<button type="button" disabled={disabled || month === "0001-01"} aria-label="Previous month" onClick={() => scrollMonth(-1)}>‹</button>
					<strong aria-live="polite">{month}</strong>
					<button type="button" disabled={disabled || month === "9999-12"} aria-label="Next month" onClick={() => scrollMonth(1)}>›</button>
				</div>
				<div role="grid" aria-label={`Calendar ${month}`} className="grid grid-cols-7 gap-1">
					{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span role="columnheader" key={day} className="text-center text-xs">{day}</span>)}
					{Array.from({ length: offset + count }, (_, index) => {
						const day = index - offset + 1
						if (day < 1) return <span key={`empty-${index}`} aria-hidden />
						const date = `${month}-${String(day).padStart(2, "0")}`
						return <button role="gridcell" type="button" key={date} data-calendar-day={date} aria-label={date} aria-selected={date === selected} aria-current={date === context.today ? "date" : undefined} tabIndex={date === selected || selectedMonth !== month && day === 1 ? 0 : -1} disabled={disabled || !stamp} className="rounded border p-1 aria-selected:bg-accent" onClick={() => selectDate(date, true)}>{day}</button>
					})}
				</div>
			</>}
			<fieldset disabled={disabled || !stamp} className="grid grid-cols-2 gap-2 text-sm">
				<legend className="sr-only">Timestamp details</legend>
				<label>Start time<input aria-label="Start time" type="time" value={stamp?.time ?? ""} className="block w-full rounded border p-1" onChange={(event) => update({ time: event.target.value || undefined, ...(event.target.value ? {} : { endTime: undefined }) })} /></label>
				<label>End time<input aria-label="End time" type="time" disabled={!stamp?.time} value={stamp?.endTime ?? ""} className="block w-full rounded border p-1" onChange={(event) => update({ endTime: event.target.value || undefined })} /></label>
				<label>Range end date<input aria-label="Range end date" type="date" min={stamp?.date} value={stamp?.endDate ?? ""} className="block w-full rounded border p-1" onChange={(event) => update({ endDate: event.target.value || undefined, ...(event.target.value ? {} : { endDateTime: undefined, endRepeater: undefined, endWarning: undefined }) })} /></label>
				<label>Range end time<input aria-label="Range end time" type="time" disabled={!stamp?.endDate} value={stamp?.endDateTime ?? ""} className="block w-full rounded border p-1" onChange={(event) => update({ endDateTime: event.target.value || undefined })} /></label>
				<label>Repeater<select aria-label="Repeater mode" value={stamp?.repeater?.mode ?? ""} className="block w-full rounded border p-1" onChange={(event) => update({ repeater: event.target.value ? { ...stamp?.repeater, mode: event.target.value as "+" | "++" | ".+", value: stamp?.repeater?.value ?? 1, unit: stamp?.repeater?.unit ?? "w" } : undefined })}>
					<option value="">None</option><option value="+">One interval (+)</option><option value="++">Catch up (++)</option><option value=".+">From completion (.+)</option>
				</select></label>
				{stamp?.repeater && <><label>Repeat every<input aria-label="Repeat interval" type="number" min="0" value={stamp.repeater.value} className="block w-full rounded border p-1" onChange={(event) => update({ repeater: { ...stamp.repeater!, value: Number(event.target.value) } })} /></label>
					<label>Repeat unit<select aria-label="Repeat unit" value={stamp.repeater.unit} className="block w-full rounded border p-1" onChange={(event) => update({ repeater: { ...stamp.repeater!, unit: event.target.value as OrgCalendarUnit } })}>{(["h", "d", "w", "m", "y"] as const).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
					<label>Maximum interval<input aria-label="Repeat maximum interval" type="number" min="1" value={stamp.repeater.maximum?.value ?? ""} className="block w-full rounded border p-1" onChange={(event) => update({ repeater: { ...stamp.repeater!, maximum: event.target.value ? { value: Number(event.target.value), unit: stamp.repeater!.maximum?.unit ?? stamp.repeater!.unit } : undefined } })} /></label>
					<label>Maximum unit<select aria-label="Repeat maximum unit" disabled={!stamp.repeater.maximum} value={stamp.repeater.maximum?.unit ?? stamp.repeater.unit} className="block w-full rounded border p-1" onChange={(event) => update({ repeater: { ...stamp.repeater!, maximum: { value: stamp.repeater!.maximum?.value ?? 1, unit: event.target.value as OrgCalendarUnit } } })}>{(["h", "d", "w", "m", "y"] as const).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label></>}
				<label>Warning<select aria-label="Warning mode" value={stamp?.warning?.mode ?? ""} className="block w-full rounded border p-1" onChange={(event) => update({ warning: event.target.value ? { mode: event.target.value as "-" | "--", value: stamp?.warning?.value ?? 3, unit: stamp?.warning?.unit ?? "d" } : undefined })}>
					<option value="">None</option><option value="-">Advance warning (-)</option><option value="--">First occurrence only (--)</option>
				</select></label>
				{stamp?.warning && <><label>Warning interval<input aria-label="Warning interval" type="number" min="0" value={stamp.warning.value} className="block w-full rounded border p-1" onChange={(event) => update({ warning: { ...stamp.warning!, value: Number(event.target.value) } })} /></label>
					<label>Warning unit<select aria-label="Warning unit" value={stamp.warning.unit} className="block w-full rounded border p-1" onChange={(event) => update({ warning: { ...stamp.warning!, unit: event.target.value as OrgCalendarUnit } })}>{(["h", "d", "w", "m", "y"] as const).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label></>}
				{stamp?.endDate && <>
					<label>Range end repeater<select aria-label="Range end repeater mode" value={stamp.endRepeater?.mode ?? ""} onChange={(event) => update({ endRepeater: event.target.value ? { ...stamp.endRepeater, mode: event.target.value as "+" | "++" | ".+", value: stamp.endRepeater?.value ?? 1, unit: stamp.endRepeater?.unit ?? "w" } : undefined })}><option value="">None</option><option value="+">One interval (+)</option><option value="++">Catch up (++)</option><option value=".+">From completion (.+)</option></select></label>
					{stamp.endRepeater && <>
						<label>Range end repeat interval<input aria-label="Range end repeat interval" type="number" min="0" value={stamp.endRepeater.value} onChange={(event) => update({ endRepeater: { ...stamp.endRepeater!, value: Number(event.target.value) } })} /></label>
						<label>Range end repeat unit<select aria-label="Range end repeat unit" value={stamp.endRepeater.unit} onChange={(event) => update({ endRepeater: { ...stamp.endRepeater!, unit: event.target.value as OrgCalendarUnit } })}>{(["h", "d", "w", "m", "y"] as const).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
						<label>Range end maximum interval<input aria-label="Range end repeat maximum interval" type="number" min="1" value={stamp.endRepeater.maximum?.value ?? ""} onChange={(event) => update({ endRepeater: { ...stamp.endRepeater!, maximum: event.target.value ? { value: Number(event.target.value), unit: stamp.endRepeater!.maximum?.unit ?? stamp.endRepeater!.unit } : undefined } })} /></label>
						<label>Range end maximum unit<select aria-label="Range end repeat maximum unit" disabled={!stamp.endRepeater.maximum} value={stamp.endRepeater.maximum?.unit ?? stamp.endRepeater.unit} onChange={(event) => update({ endRepeater: { ...stamp.endRepeater!, maximum: { value: stamp.endRepeater!.maximum?.value ?? 1, unit: event.target.value as OrgCalendarUnit } } })}>{(["h", "d", "w", "m", "y"] as const).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
					</>}
					<label>Range end warning<select aria-label="Range end warning mode" value={stamp.endWarning?.mode ?? ""} onChange={(event) => update({ endWarning: event.target.value ? { mode: event.target.value as "-" | "--", value: stamp.endWarning?.value ?? 3, unit: stamp.endWarning?.unit ?? "d" } : undefined })}><option value="">None</option><option value="-">Advance warning (-)</option><option value="--">First occurrence only (--)</option></select></label>
					{stamp.endWarning && <>
						<label>Range end warning interval<input aria-label="Range end warning interval" type="number" min="0" value={stamp.endWarning.value} onChange={(event) => update({ endWarning: { ...stamp.endWarning!, value: Number(event.target.value) } })} /></label>
						<label>Range end warning unit<select aria-label="Range end warning unit" value={stamp.endWarning.unit} onChange={(event) => update({ endWarning: { ...stamp.endWarning!, unit: event.target.value as OrgCalendarUnit } })}>{(["h", "d", "w", "m", "y"] as const).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
					</>}
				</>}
			</fieldset>
			<div className="flex justify-end gap-3"><button type="button" disabled={disabled} onClick={onCancel}>Cancel</button><button type="button" disabled={disabled || parsed.kind === "error"} onClick={() => { if (!composing.current) onAccept(value) }}>Accept</button></div>
		</section>
	)
}
