import { equalsGate } from '../helpers/index.js'

const regionCodeRequiredReason = {
  code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
  explanation: 'regionCode is mandatory when regionCodeRequirement is yes'
}

// -----------------------------------------------------------------------------
// Country of origin + regionCode conditional gate
// -----------------------------------------------------------------------------

export const countryOfOrigin = {
  id: 'a01b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  name: 'countryOfOrigin',
  status: 'mandatory'
}

export const regionCodeRequirement = {
  id: 'b12c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  name: 'regionOfOriginCodeRequirement',
  status: 'mandatory'
}

// Retain-value pattern: always in scope; mandatory when the
// requirement is 'yes', optional otherwise. Stored values are kept
// across gate flips (V4 spec: the field itself is not purged on 'no').
export const regionCode = {
  id: 'c23d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'regionOfOriginCode',
  applyTo: equalsGate(
    regionCodeRequirement,
    'yes',
    { inScope: true, status: 'mandatory', reasons: [regionCodeRequiredReason] },
    { inScope: true, status: 'optional' }
  )
}
