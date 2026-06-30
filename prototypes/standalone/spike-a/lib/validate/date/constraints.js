import { MAX_AGE, MIN_DRIVING_AGE } from './constants.js'
import { isRealDate, ageInYears } from './calendar.js'

// The calendar / not-future / age rules shared by both factories: returns a Joi
// error for the first rule that fails, or null when the date is acceptable.
export const checkDobConstraints = (year, month, day, now, helpers) => {
  if (!isRealDate(year, month, day)) {
    return helpers.error('date.real')
  }
  const date = new Date(year, month - 1, day)
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
  return null
}

export const dobMessages = (label) => ({
  'date.real': `${label} must be a real date`,
  'date.future': `${label} must be in the past`,
  'date.tooYoung': `You must be at least ${MIN_DRIVING_AGE} years old`,
  'date.tooOld': `Enter a ${label.toLowerCase()} less than ${MAX_AGE} years ago`
})
