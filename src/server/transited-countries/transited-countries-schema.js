import Joi from 'joi'

function buildCountryCodeSchema(validCountryCodes) {
  if (validCountryCodes.length === 0) {
    return Joi.string().custom((_value, helpers) =>
      helpers.error('any.invalid')
    )
  }

  return Joi.string().valid(...validCountryCodes)
}

export function buildTransitedCountriesSchema(validCountryCodes) {
  const countryCodeSchema = buildCountryCodeSchema(validCountryCodes)

  return Joi.object({
    transitedCountries: Joi.array()
      .items(countryCodeSchema)
      .single()
      .unique()
      .optional()
      .default([]),
    removeCountry: countryCodeSchema.optional(),
    action: Joi.string().valid('add', 'continue').optional(),
    q: Joi.string().optional().allow(''),
    crumb: Joi.string().optional()
  })
}
