/**
 * Domain — completeness shapes for composite (address) obligations.
 *
 * One entry per address-block obligation, keyed by obligation id:
 *   { type: 'address', required: string[], isComplete: (value) → boolean }
 *
 * `isComplete` is the completeness signal the status classifiers consume
 * (`bridge/status.js`, `bridge/collection-complete.js`,
 * `model/engine/index.js`): a partially-filled address is treated as
 * unfulfilled so the task list stays In progress and CYA prompts
 * "Complete the address". Scalar value legality (enum membership,
 * max-lengths, date shapes) is owned by the feature folders'
 * per-page validation, not by the model.
 */

import {
  commercialTransporter,
  privateTransporter,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  contactAddress,
  permanentAddress
} from '../obligations/obligations.js'

// V4 standard address block — 9 sub-fields, 6 required (Confluence page
// 6497338582). commercialTransporter adds a mandatory
// transporterAuthorisationNumber.
const ADDRESS_REQUIRED_SUB_FIELDS = [
  'name',
  'addressLine1',
  'town',
  'postcode',
  'country',
  'telephone',
  'email'
]

const COMMERCIAL_TRANSPORTER_REQUIRED = [
  'name',
  'transporterAuthorisationNumber',
  'addressLine1',
  'town',
  'postcode',
  'country',
  'telephone',
  'email'
]

// Address-block composite. Value is a plain object keyed by sub-field
// name; complete iff every required sub-field is a non-blank string.
export function addressBlock({ required }) {
  const isComplete = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false
    }
    for (const sub of required ?? []) {
      const leaf = value[sub]
      if (typeof leaf !== 'string' || leaf.trim() === '') return false
    }
    return true
  }
  return { type: 'address', required, isComplete }
}

export const commercialTransporterDomain = addressBlock({
  required: COMMERCIAL_TRANSPORTER_REQUIRED
})

export const privateTransporterDomain = addressBlock({
  required: ADDRESS_REQUIRED_SUB_FIELDS
})

export const placeOfOriginDomain = addressBlock({
  required: ADDRESS_REQUIRED_SUB_FIELDS
})

export const consignorDomain = addressBlock({
  required: ADDRESS_REQUIRED_SUB_FIELDS
})

export const consigneeDomain = addressBlock({
  required: ADDRESS_REQUIRED_SUB_FIELDS
})

export const importerDomain = addressBlock({
  required: ADDRESS_REQUIRED_SUB_FIELDS
})

export const placeOfDestinationDomain = addressBlock({
  required: ADDRESS_REQUIRED_SUB_FIELDS
})

export const contactAddressDomain = addressBlock({
  required: ADDRESS_REQUIRED_SUB_FIELDS
})

export const permanentAddressDomain = addressBlock({
  required: ADDRESS_REQUIRED_SUB_FIELDS
})

// ---------------------------------------------------------------------------
// Manifest — keyed by obligation id.
// ---------------------------------------------------------------------------

export const domain = new Map([
  [commercialTransporter.id, commercialTransporterDomain],
  [privateTransporter.id, privateTransporterDomain],
  [placeOfOrigin.id, placeOfOriginDomain],
  [consignor.id, consignorDomain],
  [consignee.id, consigneeDomain],
  [importer.id, importerDomain],
  [placeOfDestination.id, placeOfDestinationDomain],
  [contactAddress.id, contactAddressDomain],
  [permanentAddress.id, permanentAddressDomain]
])
