/**
 * Age constants and the past/young/old bounds check shared by the DOB schemas.
 */

export const MAX_AGE = 120
export const MIN_DRIVING_AGE = 17

export const ageInYears = (birth, now) => {
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

export const dateBoundsError = (date, now, helpers) => {
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
