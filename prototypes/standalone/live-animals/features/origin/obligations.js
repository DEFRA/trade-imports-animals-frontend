export const countryOfOrigin = { id: 'countryOfOrigin', required: true }

export const regionOfOriginCodeRequirement = {
  id: 'regionOfOriginCodeRequirement',
  required: true
}

export const regionOfOriginCode = {
  id: 'regionOfOriginCode',
  required: true,
  activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' },
  wipeOnExit: true
}

export const internalReferenceNumber = { id: 'internalReferenceNumber' }

export const obligations = [
  countryOfOrigin,
  regionOfOriginCodeRequirement,
  regionOfOriginCode,
  internalReferenceNumber
]
