const REQUIRED_DATE_PARTS = 3
const INCOMPLETE_DATE_TYPE = 'date.incomplete'

const isEmpty = (value) => value === '' || value === null || value === undefined

const buildDateError = (message, type, field) => ({
  message,
  path: [field],
  type,
  context: { label: field, key: field }
})

const buildDateErrorTriple = (message, type) => [
  buildDateError(message, type, 'issueDate-day'),
  buildDateError(message, type, 'issueDate-month'),
  buildDateError(message, type, 'issueDate-year')
]

/**
 * Cross-field date validation. Returns errors when:
 *  - no date parts are provided but a file is attached (date is required); or
 *  - some date parts are provided but not all three; or
 *  - all three parts are provided but do not form a real calendar date.
 * Returns a formatValidationErrors-compatible error object, or null if valid.
 *
 * @param {object} payload
 * @returns {{ details: Array } | null}
 */
export const validatePartialDate = (payload) => {
  const day = payload['issueDate-day']
  const month = payload['issueDate-month']
  const year = payload['issueDate-year']
  const filledCount = [day, month, year].filter((v) => !isEmpty(v)).length

  if (filledCount === 0) {
    const hasFile = payload.file?.payload?.length > 0
    if (!hasFile) {
      return null
    }
    return {
      details: buildDateErrorTriple('Enter a date of issue', 'date.required')
    }
  }

  if (filledCount < REQUIRED_DATE_PARTS) {
    const details = []
    if (isEmpty(day)) {
      details.push(
        buildDateError(
          'Date of issue must include a day',
          INCOMPLETE_DATE_TYPE,
          'issueDate-day'
        )
      )
    }
    if (isEmpty(month)) {
      details.push(
        buildDateError(
          'Date of issue must include a month',
          INCOMPLETE_DATE_TYPE,
          'issueDate-month'
        )
      )
    }
    if (isEmpty(year)) {
      details.push(
        buildDateError(
          'Date of issue must include a year',
          INCOMPLETE_DATE_TYPE,
          'issueDate-year'
        )
      )
    }
    return { details }
  }

  const dayInt = parseInt(day, 10)
  const monthInt = parseInt(month, 10)
  const yearInt = parseInt(year, 10)
  const date = new Date(yearInt, monthInt - 1, dayInt)
  if (
    date.getFullYear() !== yearInt ||
    date.getMonth() !== monthInt - 1 ||
    date.getDate() !== dayInt
  ) {
    return {
      details: buildDateErrorTriple(
        'Enter a real date of issue',
        'date.invalid'
      )
    }
  }

  return null
}
