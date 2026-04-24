import Joi from 'joi'

export const DOCUMENT_TYPES = ['ITAHC', 'VETERINARY_HEALTH_CERTIFICATE']

const MAX_DOCUMENT_REFERENCE_LENGTH = 100
const MAX_DAY = 31
const MAX_MONTH = 12
const MIN_YEAR = 1900

export const accompanyingDocumentsSchema = Joi.object({
  documentType: Joi.string()
    .valid(...DOCUMENT_TYPES)
    .required()
    .messages({
      'any.only': 'Select a document type',
      'any.required': 'Select a document type',
      'string.empty': 'Select a document type'
    }),
  documentReference: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^[a-zA-Z0-9 -]*$/)
    .max(MAX_DOCUMENT_REFERENCE_LENGTH)
    .messages({
      'string.pattern.base':
        'Document reference must only contain letters, numbers, spaces and hyphens',
      'string.max': `Document reference must be ${MAX_DOCUMENT_REFERENCE_LENGTH} characters or less`
    }),
  'issueDate-day': Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(MAX_DAY),
      Joi.string().pattern(/^\d+$/).allow('')
    )
    .optional(),
  'issueDate-month': Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(MAX_MONTH),
      Joi.string().pattern(/^\d+$/).allow('')
    )
    .optional(),
  'issueDate-year': Joi.alternatives()
    .try(
      Joi.number().integer().min(MIN_YEAR),
      Joi.string().pattern(/^\d+$/).allow('')
    )
    .optional(),
  crumb: Joi.string().optional().allow('', null),
  file: Joi.any().optional()
})

/**
 * Cross-field date validation: if any date part is provided, all three must be.
 * Returns a formatValidationErrors-compatible error object, or null if valid.
 *
 * @param {object} payload
 * @returns {{ details: Array } | null}
 */
export const validatePartialDate = (payload) => {
  const isEmpty = (value) =>
    value === '' || value === null || value === undefined
  const day = payload['issueDate-day']
  const month = payload['issueDate-month']
  const year = payload['issueDate-year']
  const filledCount = [day, month, year].filter(
    (value) => !isEmpty(value)
  ).length

  if (filledCount === 0) {
    return {
      details: [
        {
          message: 'Enter a date of issue',
          path: ['issueDate-day'],
          type: 'date.required',
          context: { label: 'issueDate-day', key: 'issueDate-day' }
        },
        {
          message: 'Enter a date of issue',
          path: ['issueDate-month'],
          type: 'date.required',
          context: { label: 'issueDate-month', key: 'issueDate-month' }
        },
        {
          message: 'Enter a date of issue',
          path: ['issueDate-year'],
          type: 'date.required',
          context: { label: 'issueDate-year', key: 'issueDate-year' }
        }
      ]
    }
  }

  if (filledCount < 3) {
    const details = []
    if (isEmpty(day)) {
      details.push({
        message: 'Date of issue must include a day',
        path: ['issueDate-day'],
        type: 'date.incomplete',
        context: { label: 'issueDate-day', key: 'issueDate-day' }
      })
    }
    if (isEmpty(month)) {
      details.push({
        message: 'Date of issue must include a month',
        path: ['issueDate-month'],
        type: 'date.incomplete',
        context: { label: 'issueDate-month', key: 'issueDate-month' }
      })
    }
    if (isEmpty(year)) {
      details.push({
        message: 'Date of issue must include a year',
        path: ['issueDate-year'],
        type: 'date.incomplete',
        context: { label: 'issueDate-year', key: 'issueDate-year' }
      })
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
      details: [
        {
          message: 'Enter a real date of issue',
          path: ['issueDate-day'],
          type: 'date.invalid',
          context: { label: 'issueDate-day', key: 'issueDate-day' }
        },
        {
          message: 'Enter a real date of issue',
          path: ['issueDate-month'],
          type: 'date.invalid',
          context: { label: 'issueDate-month', key: 'issueDate-month' }
        },
        {
          message: 'Enter a real date of issue',
          path: ['issueDate-year'],
          type: 'date.invalid',
          context: { label: 'issueDate-year', key: 'issueDate-year' }
        }
      ]
    }
  }

  return null
}
