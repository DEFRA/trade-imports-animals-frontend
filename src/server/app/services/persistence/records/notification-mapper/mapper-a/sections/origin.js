import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact, orUndefined } from '../../shared/compact.js'

export const originFromFulfilment = (reader) => {
  const {
    countryOfOrigin,
    internalReferenceNumber,
    regionCodeRequirement,
    regionCode
  } = obligationSet()
  return orUndefined(
    compact({
      countryCode: reader.scalar(countryOfOrigin),
      requiresRegionCode: reader.scalar(regionCodeRequirement),
      regionOfOriginCode: reader.scalar(regionCode),
      internalReference: reader.scalar(internalReferenceNumber)
    })
  )
}
