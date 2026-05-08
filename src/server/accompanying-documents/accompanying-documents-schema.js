import Joi from 'joi'
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENT_REFERENCE_LENGTH
} from './document-upload-config.js'

const MAX_DAY = 31
const MAX_MONTH = 12
const MIN_YEAR = 1900
const SELECT_DOCUMENT_TYPE_MESSAGE = 'Select a document type'

export const accompanyingDocumentsSchema = Joi.object({
  documentType: Joi.string()
    .valid(...DOCUMENT_TYPES)
    .required()
    .messages({
      'any.only': SELECT_DOCUMENT_TYPE_MESSAGE,
      'any.required': SELECT_DOCUMENT_TYPE_MESSAGE,
      'string.empty': SELECT_DOCUMENT_TYPE_MESSAGE
    }),
  documentReference: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^[a-zA-Z0-9]*$/)
    .max(MAX_DOCUMENT_REFERENCE_LENGTH)
    .messages({
      'string.pattern.base':
        'Document reference must only contain letters and numbers',
      'string.max': `Document reference must be ${MAX_DOCUMENT_REFERENCE_LENGTH} characters or less`
    }),
  'issueDate-day': Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(MAX_DAY),
      Joi.string()
        .pattern(/^0*[1-9]\d*$/)
        .allow('')
    )
    .optional(),
  'issueDate-month': Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(MAX_MONTH),
      Joi.string()
        .pattern(/^0*[1-9]\d*$/)
        .allow('')
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
