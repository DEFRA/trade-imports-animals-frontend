import { MAX_AGE, MIN_DRIVING_AGE } from '../run-payload.js'

export const MIN_DAY = 1
export const MAX_DAY = 31
export const MIN_MONTH = 1
export const MAX_MONTH = 12
export const MIN_YEAR = 1000
export const MAX_YEAR = 9999

const isRealDate = (day, month, year) => {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

const ageInYears = (birth, now) => {
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

// Shared realness + future + age-bounds check; raises the same four error codes
// from both required and optional DOB modes. Returns the numeric day on success.
export const checkCalendarAndAge = (day, month, year, helpers) => {
  if (!isRealDate(day, month, year)) {
    return helpers.error('date.real')
  }
  const date = new Date(year, month - 1, day)
  const now = new Date()
  if (date.getTime() > now.getTime()) {
    return helpers.error('date.future')
  }
  const age = ageInYears(date, now)
  if (age < MIN_DRIVING_AGE) {
    return helpers.error('date.tooYoung')
  }
  if (age > MAX_AGE) {
    return helpers.error('date.tooOld')
  }
  return day
}

export const countFilledParts = (day, month, year) =>
  [day, month, year].filter((part) => part !== '').length

export const parseParts = (day, month, year) => ({
  dayNum: Number(day),
  monthNum: Number(month),
  yearNum: Number(year)
})

export const checkPartRanges = (day, month, year, helpers) => {
  if (day < MIN_DAY || day > MAX_DAY) {
    return helpers.error('dob.dayRange')
  }
  if (month < MIN_MONTH || month > MAX_MONTH) {
    return helpers.error('dob.monthRange')
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return helpers.error('dob.yearRange')
  }
  return undefined
}

export const trim = (value) => String(value ?? '').trim()

export const capitalise = (str) => str[0].toUpperCase() + str.slice(1)
