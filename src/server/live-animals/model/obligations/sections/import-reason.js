import { equalsGate, includesGate } from '../helpers/index.js'

const purposeInInternalMarketReason = {
  code: 'obligation.purposeInInternalMarket.applicable.becauseInternalMarket',
  explanation:
    'purposeInInternalMarket applies when reasonForImport is internalMarket'
}

const destinationCountryReason = {
  code: 'obligation.destinationCountry.applicable.becauseTransitOrTranshipment',
  explanation:
    'destinationCountry applies when reasonForImport is transit or transhipmentOrOnwardTravel'
}

const portOfExitReason = {
  code: 'obligation.portOfExit.applicable.becauseTransitOrTemporaryAdmissionHorses',
  explanation:
    'portOfExit applies when reasonForImport is transit or temporaryAdmissionHorses'
}

const exitDateReason = {
  code: 'obligation.exitDate.applicable.becauseTemporaryAdmissionHorses',
  explanation:
    'exitDate applies when reasonForImport is temporaryAdmissionHorses'
}

// -----------------------------------------------------------------------------
// Reason for import + purpose in internal market
// -----------------------------------------------------------------------------

export const reasonForImport = {
  id: 'd34e5f6a-7b8c-4d9e-8f01-2a3b4c5d6e7f',
  name: 'reasonForImport',
  status: 'mandatory'
}

// Purge-on-flip: when reasonForImport is not 'internalMarket',
// purposeInInternalMarket goes out of scope and any stored value is
// dropped.
export const purposeInInternalMarket = {
  id: 'e45f6a7b-8c9d-4e01-8f23-4a5b6c7d8e9f',
  name: 'purposeInInternalMarket',
  applyTo: equalsGate(
    reasonForImport,
    'internalMarket',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [purposeInInternalMarketReason]
    },
    { inScope: false }
  )
}

// V4 (Confluence page 6497338582, "Reason of Import" section):
// destinationCountry applies when reasonForImport ∈ { transit,
// transhipmentOrOnwardTravel }. Purge-on-flip.
const DESTINATION_COUNTRY_APPLICABLE_REASONS = [
  'transit',
  'transhipmentOrOnwardTravel'
]

export const destinationCountry = {
  id: 'f56a7b8c-9d0e-4f12-8034-5b6c7d8e9f01',
  name: 'destinationCountry',
  applyTo: includesGate(
    reasonForImport,
    DESTINATION_COUNTRY_APPLICABLE_REASONS,
    {
      inScope: true,
      status: 'mandatory',
      reasons: [destinationCountryReason]
    },
    { inScope: false }
  )
}

// V4: portOfExit applies when reasonForImport ∈ { transit,
// temporaryAdmissionHorses }. Spec: "Port selected from the port of
// entry list (Exit and Entry share the same list)." Purge-on-flip.
const PORT_OF_EXIT_APPLICABLE_REASONS = ['transit', 'temporaryAdmissionHorses']

export const portOfExit = {
  id: 'a67b8c9d-0e1f-4023-8145-6c7d8e9f0112',
  name: 'portOfExit',
  applyTo: includesGate(
    reasonForImport,
    PORT_OF_EXIT_APPLICABLE_REASONS,
    {
      inScope: true,
      status: 'mandatory',
      reasons: [portOfExitReason]
    },
    { inScope: false }
  )
}

// V4: exitDate applies only when reasonForImport is
// temporaryAdmissionHorses. Purge-on-flip.
export const exitDate = {
  id: 'b78c9d0e-1f20-4134-8256-7d8e9f012023',
  name: 'exitDate',
  applyTo: equalsGate(
    reasonForImport,
    'temporaryAdmissionHorses',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [exitDateReason]
    },
    { inScope: false }
  )
}
