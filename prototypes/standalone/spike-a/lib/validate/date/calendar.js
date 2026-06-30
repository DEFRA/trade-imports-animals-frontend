/** Pure calendar / string utilities shared by the DOB constraint checks. */

export const isRealDate = (year, month, day) => {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function ageInYears(birth, now) {
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

export function trim(value) {
  return String(value ?? '').trim()
}

export function capitalise(str) {
  return str[0].toUpperCase() + str.slice(1)
}
