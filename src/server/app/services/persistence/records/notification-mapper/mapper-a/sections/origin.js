import { parentCountryCode } from '../../../../../countries/index.js'
import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact, orUndefined } from '../../shared/compact.js'

export const originFromFulfilment = (reader) => {
  const {
    countryOfOrigin,
    countryOfOriginSubdivisionCode,
    internalReferenceNumber,
    regionCodeRequirement,
    regionCode
  } = obligationSet()
  const selectedOrigin = reader.scalar(countryOfOrigin)
  const subdivisionCode = reader.scalar(countryOfOriginSubdivisionCode)
  return orUndefined(
    compact({
      countryCode: subdivisionCode
        ? parentCountryCode(subdivisionCode)
        : selectedOrigin,
      countrySubdivisionCode: subdivisionCode || undefined,
      requiresRegionCode: reader.scalar(regionCodeRequirement),
      regionOfOriginCode: reader.scalar(regionCode),
      internalReference: reader.scalar(internalReferenceNumber)
    })
  )
}
