const cairoDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function cairoDayKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid date: ${iso}`)
  }

  const parts = cairoDate.formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    throw new RangeError(`Could not format Cairo day for: ${iso}`)
  }

  return `${year}-${month}-${day}`
}
