const zodiacAnimals = [
	"Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake",
	"Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig",
] as const
const monthNames = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
] as const
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
const pad = (value: number, width = 2): string => String(value).padStart(width, "0")

/** Doom's Gregorian zodiac and local calendar, from one already-captured instant. */
export const orgLocalCalendar = (date: Date) => {
	const year = date.getFullYear()
	const month = date.getMonth()
	const day = pad(date.getDate())
	const dateText = `${pad(year, 4)}-${pad(month + 1)}-${day}`
	const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
	const zodiac = zodiacAnimals[((year - 1900) % 12 + 12) % 12]
	return {
		directory: `ا-diary/year-${pad(year, 4)}-${zodiac}/month-${pad(month + 1)}-${monthNames[month]}/day-${day}-${weekdayNames[date.getDay()]}`,
		dateText,
		time,
		dateTime: `${dateText} ${time}`,
		epochSeconds: Math.floor(date.getTime() / 1000),
	}
}
