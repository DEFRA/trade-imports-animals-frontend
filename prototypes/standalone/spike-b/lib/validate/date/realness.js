/**
 * Calendar-realness and DOB part-parsing helpers + the day/month/year range
 * constants the schemas share.
 */

export const MIN_DAY = 1
export const MAX_DAY = 31
export const MIN_MONTH = 1
export const MAX_MONTH = 12
export const MIN_YEAR = 1000
export const MAX_YEAR = 9999
export const DATE_PART_COUNT = 3

export const realCalendarDate = (year, month, day) => {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export const countFilled = (parts) => parts.filter((part) => part !== '').length

export const parsedDobParts = ({ day, month, year }) => {
  const dayNum = Number(day)
  const monthNum = Number(month)
  const yearNum = Number(year)
  if (
    !Number.isInteger(dayNum) ||
    !Number.isInteger(monthNum) ||
    !Number.isInteger(yearNum)
  ) {
    return null
  }
  return { dayNum, monthNum, yearNum }
}

export const partRangeError = (dayNum, monthNum, yearNum, helpers) => {
  if (dayNum < MIN_DAY || dayNum > MAX_DAY) {
    return helpers.error('dob.dayRange')
  }
  if (monthNum < MIN_MONTH || monthNum > MAX_MONTH) {
    return helpers.error('dob.monthRange')
  }
  if (yearNum < MIN_YEAR || yearNum > MAX_YEAR) {
    return helpers.error('dob.yearRange')
  }
  return null
}

export const trim = (value) => String(value ?? '').trim()

export const capitalise = (str) => str[0].toUpperCase() + str.slice(1)
