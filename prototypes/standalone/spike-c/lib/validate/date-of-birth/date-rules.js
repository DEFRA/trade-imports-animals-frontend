import {
  MAX_AGE,
  MIN_DRIVING_AGE,
  MIN_DAY,
  MAX_DAY,
  MIN_MONTH,
  MAX_MONTH,
  MIN_YEAR,
  MAX_YEAR
} from './constants.js'

/**
 * The calendar / age leaf helpers shared by both DOB modes, plus the two small
 * string helpers used to build their messages.
 */

export const dobKeys = (prefix) => ({
  dayKey: `${prefix}-day`,
  monthKey: `${prefix}-month`,
  yearKey: `${prefix}-year`
})

const isRealCalendarDate = (date, year, month, day) =>
  date.getFullYear() === year &&
  date.getMonth() === month - 1 &&
  date.getDate() === day

const ageInYears = (birth, now) => {
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

// The single source of truth for the calendar / future / age rules shared by
// both DOB modes. Returns a Joi error code, or null when the date is valid.
export const gdsDateError = (year, month, day, now) => {
  const date = new Date(year, month - 1, day)
  if (!isRealCalendarDate(date, year, month, day)) {
    return 'date.real'
  }
  if (date.getTime() > now.getTime()) {
    return 'date.future'
  }
  const age = ageInYears(date, now)
  if (age < MIN_DRIVING_AGE) {
    return 'date.tooYoung'
  }
  if (age > MAX_AGE) {
    return 'date.tooOld'
  }
  return null
}

export const dobFillState = (day, month, year) => {
  const filled = [day, month, year].filter((part) => part !== '').length
  if (filled === 0) {
    return 'blank'
  }
  return filled < 3 ? 'partial' : 'full'
}

export const partRangeError = (dayNum, monthNum, yearNum) => {
  if (dayNum < MIN_DAY || dayNum > MAX_DAY) {
    return 'dob.dayRange'
  }
  if (monthNum < MIN_MONTH || monthNum > MAX_MONTH) {
    return 'dob.monthRange'
  }
  if (yearNum < MIN_YEAR || yearNum > MAX_YEAR) {
    return 'dob.yearRange'
  }
  return null
}

export const trim = (value) => String(value ?? '').trim()

export const capitalise = (text) => text[0].toUpperCase() + text.slice(1)
