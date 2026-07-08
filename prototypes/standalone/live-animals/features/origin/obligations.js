/**
 * `required` is the completion fact the status roll-up reads ("what is
 * owed") — it does NOT block save. Save-blocking is controller-owned
 * validation; countryOfOrigin's `requiredText` is the journey's only one.
 */
export const countryOfOrigin = {
  id: 'countryOfOrigin',
  required: true,
  enforcedAt: 'continue'
}

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
