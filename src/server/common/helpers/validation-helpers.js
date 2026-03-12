/**
 * Convert Joi validation errors to GOV.UK error format
 * @param {Object} joiError - Joi validation error object
 * @returns {Object} Formatted errors with errorList and fieldErrors
 */
export function formatValidationErrors(joiError) {
  const errorList = joiError.details.map((detail) => ({
    text: detail.message,
    href: `#${detail.path.join('-')}`
  }))

  const fieldErrors = {}
  joiError.details.forEach((detail) => {
    const fieldName = detail.path.join('-')
    fieldErrors[fieldName] = { text: detail.message }
  })

  return { errorList, fieldErrors }
}
