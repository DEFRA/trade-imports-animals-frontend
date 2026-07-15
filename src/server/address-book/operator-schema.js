import Joi from 'joi'

const operatorTypes = [
  'PLACE_OF_ORIGIN',
  'CONSIGNOR',
  'CONSIGNEE',
  'IMPORTER',
  'PLACE_OF_DESTINATION',
  'TRANSPORTER',
  'BRANCH_ADDRESS'
]

/**
 * Build the add/edit operator Joi schema. Country membership is enforced here
 * from the FULL MDM country list (c-009), so the schema is built per-request.
 *
 * An empty or missing country list is a reference-data failure, not "no valid
 * countries": a schema is NEVER built from an empty membership list, because
 * `Joi.valid()` over an empty list would reject every country and strand the
 * trader on an unsubmittable form (§7.4). Callers let this throw to the
 * standard error page rather than degrading to an empty list.
 * @param {string[]} mdmCountryNames - the full MDM country display-name list
 * @returns {Joi.ObjectSchema} the operator schema
 */
export function buildOperatorSchema(mdmCountryNames) {
  if (!Array.isArray(mdmCountryNames) || mdmCountryNames.length === 0) {
    throw new Error(
      'Cannot build the operator schema from an empty country list'
    )
  }

  return Joi.object({
    operatorType: Joi.string()
      .valid(...operatorTypes)
      .required()
      .messages({
        'any.required': 'Select an operator type',
        'any.only': 'Select an operator type',
        'string.empty': 'Select an operator type'
      }),
    name: Joi.string().max(255).required().messages({
      'any.required': 'Enter a name',
      'string.empty': 'Enter a name',
      'string.max': 'Name must be 255 characters or less'
    }),
    addressLine1: Joi.string().max(255).required().messages({
      'any.required': 'Enter address line 1',
      'string.empty': 'Enter address line 1',
      'string.max': 'Address line 1 must be 255 characters or less'
    }),
    addressLine2: Joi.string().max(255).allow('').optional().messages({
      'string.max': 'Address line 2 must be 255 characters or less'
    }),
    city: Joi.string().max(100).required().messages({
      'any.required': 'Enter a town or city',
      'string.empty': 'Enter a town or city',
      'string.max': 'Town or city must be 100 characters or less'
    }),
    county: Joi.string().max(100).allow('').optional().messages({
      'string.max': 'County must be 100 characters or less'
    }),
    postcode: Joi.string().max(12).required().messages({
      'any.required': 'Enter a postcode',
      'string.empty': 'Enter a postcode',
      'string.max': 'Postcode must be 12 characters or less'
    }),
    country: Joi.string()
      .valid(...mdmCountryNames)
      .required()
      .messages({
        'any.required': 'Select a country',
        'any.only': 'Select a country',
        'string.empty': 'Select a country'
      }),
    telephone: Joi.string().max(20).required().messages({
      'any.required': 'Enter a telephone number',
      'string.empty': 'Enter a telephone number',
      'string.max': 'Telephone number must be 20 characters or less'
    }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(254)
      .required()
      .messages({
        'any.required': 'Enter an email address',
        'string.empty': 'Enter an email address',
        'string.email':
          'Enter an email address in the correct format, like name@example.com',
        'string.max': 'Email address must be 254 characters or less'
      }),
    approvalNumber: Joi.any().when('operatorType', {
      is: 'TRANSPORTER',
      then: Joi.string().max(255).allow('').optional().messages({
        'string.max': 'Approval number must be 255 characters or less'
      }),
      otherwise: Joi.any().forbidden().messages({
        'any.unknown':
          'Approval number is only allowed for transporter operators'
      })
    }),
    transporterCategory: Joi.any().when('operatorType', {
      is: 'TRANSPORTER',
      then: Joi.string().valid('PRIVATE', 'COMMERCIAL').optional().messages({
        'any.only': 'Select a transporter category'
      }),
      otherwise: Joi.any().forbidden().messages({
        'any.unknown':
          'Transporter category is only allowed for transporter operators'
      })
    }),
    crumb: Joi.string().optional().allow('', null)
  })
}
