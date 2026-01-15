import { useCallback, useEffect, useRef, useState } from "react"
import { Slider } from "./slider"

interface DebouncedSliderProps {
	value: number[]
	onValueChange: (value: number[]) => void
	min?: number
	max?: number
	step?: number
	className?: string
	debounceMs?: number
}

/**
 * Slider with debounced value change to prevent excessive state updates
 * Updates local state immediately for smooth UI, but debounces the callback
 */
export function DebouncedSlider({
	value,
	onValueChange,
	debounceMs = 150,
	...props
}: DebouncedSliderProps) {
	const [localValue, setLocalValue] = useState(value)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isInteractingRef = useRef(false)

	// Sync with external value when not interacting
	useEffect(() => {
		if (!isInteractingRef.current) {
			setLocalValue(value)
		}
	}, [value])

	const handleValueChange = useCallback(
		(newValue: number[]) => {
			isInteractingRef.current = true
			setLocalValue(newValue)

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}

			timeoutRef.current = setTimeout(() => {
				onValueChange(newValue)
				isInteractingRef.current = false
			}, debounceMs)
		},
		[onValueChange, debounceMs],
	)

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	return <Slider value={localValue} onValueChange={handleValueChange} {...props} />
}
