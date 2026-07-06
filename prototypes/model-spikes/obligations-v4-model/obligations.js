/**
 * Obligations — Live Animals V4 data-field model.
 *
 * Source: Confluence "Live Animals Data Fields - V4" (page 6497338582).
 * Model under test: obligations model from EUDPA-249 spike (see
 * ../obligations/). This manifest expresses the V4 domain against that
 * model; see GAPS.md for anything the model can't express naturally.
 *
 * Modelling walk (iterations land layer by layer):
 *   1. Notification-level countryOfOrigin + regionCodeRequirement gate.
 *   2. Notification-level singles + standard address blocks (this
 *      iteration): reason/purpose gate, transporter-type mutually-
 *      exclusive commercial/private address blocks, means-of-transport
 *      gate on transitedCountries, six standard address blocks storing
 *      composite values.
 *   3. Commodity line (user-driven indexed group).
 *   4. Unit record (nested user-driven indexed group).
 *   5. Accompanying Document all-or-nothing block.
 *
 * System-populated fields (Reference Number, gov.identity-fed Responsible
 * Person, MDM-sourced enum values) are stubbed in test fixtures rather
 * than modelled as obligations.
 *
 * Standard address block: modelled as a single-cardinality obligation
 * whose stored value is a composite `{ name, addressLine1, addressLine2?,
 * town, county?, postCode, country, telephone, email }`. Field-level
 * validation of the composite (max-length, formats, mandatory subfields)
 * is out of scope of the obligation model.
 */

// -----------------------------------------------------------------------------
// Country of origin + regionCode conditional gate
// -----------------------------------------------------------------------------

export const countryOfOrigin = {
  id: 'a01b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  name: 'countryOfOrigin',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const regionCodeRequirement = {
  id: 'b12c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  name: 'regionCodeRequirement',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Conditional: required when regionCodeRequirement === 'yes'. Modelled
// as always-in-scope-with-optional-status when the gate is off, so a
// previously-entered value is retained across gate flips (matches the
// V4 spec: the field itself is not purged on `no`).
export const regionCode = {
  id: 'c23d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'regionCode',
  applyTo: (fulfilments) => {
    if (fulfilments[regionCodeRequirement.id] === 'yes') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
            explanation:
              'regionCode is mandatory when regionCodeRequirement is yes'
          }
        ]
      }
    }
    return { inScope: true, status: 'optional' }
  }
}

// -----------------------------------------------------------------------------
// Reason for import + purpose in internal market
// -----------------------------------------------------------------------------

export const reasonForImport = {
  id: 'd34e5f6a-7b8c-4d9e-8f01-2a3b4c5d6e7f',
  name: 'reasonForImport',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Purge-on-flip is the default: when reasonForImport is not
// 'internal-market', purposeInInternalMarket goes out of scope and any
// stored value is dropped (matches V4 spec — the field is only present
// when applicable).
export const purposeInInternalMarket = {
  id: 'e45f6a7b-8c9d-4e01-8f23-4a5b6c7d8e9f',
  name: 'purposeInInternalMarket',
  applyTo: (fulfilments) => {
    if (fulfilments[reasonForImport.id] === 'internal-market') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.purposeInInternalMarket.applicable.becauseInternalMarket',
            explanation:
              'purposeInInternalMarket applies when reasonForImport is internal-market'
          }
        ]
      }
    }
    return { inScope: false }
  }
}

// -----------------------------------------------------------------------------
// Contains unweaned animals
// -----------------------------------------------------------------------------

export const containsUnweanedAnimals = {
  id: '01a2b3c4-d5e6-4f07-8a89-0b1c2d3e4f5a',
  name: 'containsUnweanedAnimals',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Standard address blocks — always in scope. Composite value stored
// directly on the obligation id.
// -----------------------------------------------------------------------------

export const placeOfOrigin = {
  id: '89c0d1e2-f3a4-4b5f-8c0b-8d9e0f1a2b3c',
  name: 'placeOfOrigin',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const consignor = {
  id: '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d',
  name: 'consignor',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const consignee = {
  id: 'abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e',
  name: 'consignee',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const importer = {
  id: 'bcf3a4b5-c6d7-4e82-8f3e-ba1b2c3d4e5f',
  name: 'importer',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const placeOfDestination = {
  id: 'cd04b5c6-d7e8-4f93-8a4f-cb2c3d4e5f60',
  name: 'placeOfDestination',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Transporter type + mutually-exclusive address blocks
// -----------------------------------------------------------------------------

export const transporterType = {
  id: '34d5e6f7-a8b9-4c0a-8dbc-3e4f5a6b7c8d',
  name: 'transporterType',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Purge-on-flip: switching transporterType from 'commercial' to
// 'private' drops any stored commercialTransporter address (out-of-scope
// obligations are removed from storage by the evaluator's purge step).
export const commercialTransporter = {
  id: 'de15c6d7-e8f9-4a04-8b50-dc3d4e5f6071',
  name: 'commercialTransporter',
  applyTo: (fulfilments) => {
    if (fulfilments[transporterType.id] === 'commercial') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.commercialTransporter.applicable.becauseCommercial',
            explanation:
              'commercialTransporter applies when transporterType is commercial'
          }
        ]
      }
    }
    return { inScope: false }
  }
}

export const privateTransporter = {
  id: 'ef26d7e8-f9a0-4b15-8c61-ed4e5f607182',
  name: 'privateTransporter',
  applyTo: (fulfilments) => {
    if (fulfilments[transporterType.id] === 'private') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.privateTransporter.applicable.becausePrivate',
            explanation:
              'privateTransporter applies when transporterType is private'
          }
        ]
      }
    }
    return { inScope: false }
  }
}

// -----------------------------------------------------------------------------
// Means of transport + gated transited-countries multi-select
// -----------------------------------------------------------------------------

export const meansOfTransport = {
  id: '45e6f7a8-b9c0-4d1b-8ecd-4f5a6b7c8d9e',
  name: 'meansOfTransport',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const transportIdentification = {
  id: '56f7a8b9-c0d1-4e2c-8fde-5a6b7c8d9e0f',
  name: 'transportIdentification',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const transportDocumentReference = {
  id: '67a8b9c0-d1e2-4f3d-8aef-6b7c8d9e0f1a',
  name: 'transportDocumentReference',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Conditional in-scope-optional multi-select — stored as an array of
// country strings. Out of scope (and purged) when means-of-transport is
// not railway or road-vehicle.
export const transitedCountries = {
  id: '78b9c0d1-e2f3-4a4e-8bfa-7c8d9e0f1a2b',
  name: 'transitedCountries',
  applyTo: (fulfilments) => {
    const means = fulfilments[meansOfTransport.id]
    if (means === 'railway' || means === 'road-vehicle') {
      return {
        inScope: true,
        status: 'optional',
        reasons: [
          {
            code: 'obligation.transitedCountries.applicable.becauseLandTransport',
            explanation:
              'transitedCountries applies when meansOfTransport is railway or road-vehicle'
          }
        ]
      }
    }
    return { inScope: false }
  }
}

// -----------------------------------------------------------------------------
// Arrival at port
// -----------------------------------------------------------------------------

export const arrivalDateAtPort = {
  id: '12b3c4d5-e6f7-4a08-8b9a-1c2d3e4f5a6b',
  name: 'arrivalDateAtPort',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const portOfEntry = {
  id: '23c4d5e6-f7a8-4b09-8cab-2d3e4f5a6b7c',
  name: 'portOfEntry',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Contact address (user-entered variant — gov.identity variant stubbed
// as pre-filled fulfilment per Q4)
// -----------------------------------------------------------------------------

export const contactAddress = {
  id: 'f037e8f9-a0b1-4c26-8d72-fe5f60718293',
  name: 'contactAddress',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Internal reference (trader-entered)
// -----------------------------------------------------------------------------

export const internalReferenceNumber = {
  id: '10e5f607-1829-4a3b-84c5-06d7e8f9a0b1',
  name: 'internalReferenceNumber',
  applyTo: () => ({ inScope: true, status: 'optional' })
}

// -----------------------------------------------------------------------------
// Manifest — order does not affect evaluation (evaluator builds group
// hierarchy via `within` back-references).
// -----------------------------------------------------------------------------

export const obligations = [
  countryOfOrigin,
  regionCodeRequirement,
  regionCode,
  reasonForImport,
  purposeInInternalMarket,
  containsUnweanedAnimals,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  transporterType,
  commercialTransporter,
  privateTransporter,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  arrivalDateAtPort,
  portOfEntry,
  contactAddress,
  internalReferenceNumber
]

// Groups are obligations that other obligations reference via `within`.
export const groups = obligations.filter((o) =>
  obligations.some((other) => other.within === o)
)
