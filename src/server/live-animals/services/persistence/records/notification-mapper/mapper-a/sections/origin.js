import {
  countryOfOrigin,
  internalReferenceNumber,
  regionCodeRequirement
} from '../../../../../../model/obligations/obligations.js'
import { compact, orUndefined } from '../../shared/compact.js'

export const originFromFulfilment = (reader) =>
  orUndefined(
    compact({
      countryCode: reader.scalar(countryOfOrigin),
      requiresRegionCode: reader.scalar(regionCodeRequirement),
      internalReference: reader.scalar(internalReferenceNumber)
    })
  )
