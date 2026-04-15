import Joi from 'joi'

export const DOCUMENT_TYPES = ['ITAHC', 'VETERINARY_HEALTH_CERTIFICATE']

export const accompanyingDocumentsSchema = Joi.object({
  documentType: Joi.string()
    .valid(...DOCUMENT_TYPES, '')
    .optional()
    .allow('', null)
    .messages({
      'any.only': 'Select a document type'
    }),
  documentReference: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^[a-zA-Z0-9 -]*$/)
    .max(100)
    .messages({
      'string.pattern.base':
        'Document reference must only contain letters, numbers, spaces and hyphens',
      'string.max': 'Document reference must be 100 characters or less'
    }),
  'issueDate-day': Joi.alternatives()
    .try(Joi.number().integer().min(1).max(31), Joi.string().allow('', null))
    .optional(),
  'issueDate-month': Joi.alternatives()
    .try(Joi.number().integer().min(1).max(12), Joi.string().allow('', null))
    .optional(),
  'issueDate-year': Joi.alternatives()
    .try(Joi.number().integer().min(1900), Joi.string().allow('', null))
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
export function validatePartialDate(payload) {
  const isEmpty = (v) => v === '' || v === null || v === undefined
  const day = payload['issueDate-day']
  const month = payload['issueDate-month']
  const year = payload['issueDate-year']
  const filledCount = [day, month, year].filter((v) => !isEmpty(v)).length

  if (filledCount > 0 && filledCount < 3) {
    return {
      details: [
        {
          message: 'Enter a complete date of issue',
          path: ['issueDate-day'],
          type: 'date.incomplete',
          context: { label: 'issueDate-day', key: 'issueDate-day' }
        }
      ]
    }
  }

  return null
}
