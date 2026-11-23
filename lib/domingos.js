function formatLocalDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export function getUltimosDomingos(reference = new Date()) {
    const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)

    const cursor = new Date(today)
    cursor.setDate(cursor.getDate() - cursor.getDay())

    const sundays = []
    while (cursor >= start) {
        sundays.push(formatLocalDate(cursor))
        cursor.setDate(cursor.getDate() - 7)
    }

    return sundays
}
