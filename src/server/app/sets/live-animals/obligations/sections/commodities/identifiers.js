import {
  earTagCommodityCodes,
  horseNameCommodityCodes,
  identifiedCommodityCodes,
  microchipCommodityCodes,
  passportCommodityCodes,
  permanentAddressCodeSpecies,
  tattooCommodityCodes
} from '../../../services/commodities/index.js'
import {
  allowListed,
  allowListedPairs,
  moreThanOne
} from '../../../../../model/obligations/helpers/index.js'
import { commodityCode, commodityLine, speciesLatinName } from './lines.js'

const microchipReason = {
  code: 'obligation.microchip.applicable.becauseMicrochipCommodity',
  explanation:
    'microchip applies on units of lines whose commodityCode is in the microchip list'
}

const passportReason = {
  code: 'obligation.passport.applicable.becausePassportCommodity',
  explanation:
    'passport applies on units of lines whose commodityCode is in the passport list'
}

const tattooReason = {
  code: 'obligation.tattoo.applicable.becauseTattooCommodity',
  explanation:
    'tattoo applies on units of lines whose commodityCode is in the tattoo list'
}

const earTagReason = {
  code: 'obligation.earTag.applicable.becauseEarTagCommodity',
  explanation:
    'earTag applies on units of lines whose commodityCode is in the ear-tag list'
}

const horseNameReason = {
  code: 'obligation.horseName.applicable.becauseHorseCommodity',
  explanation: 'horseName applies on units of horse-commodity lines'
}

const permanentAddressReason = {
  code: 'obligation.permanentAddress.applicable.becausePermanentAddressLine',
  explanation:
    'permanentAddress applies on units of lines whose commodityCode and species pair is in the permanent-address list'
}

// -----------------------------------------------------------------------------
// Unit record — nested user-driven indexed group inside commodityLine.
// Composite keys have length 2: `lineId/unitId`. Instance-ids are
// opaque orchestrator-generated ULIDs.
// -----------------------------------------------------------------------------

export const unitRecord = {
  id: '385d6e7f-8091-4eb5-8234-8ef506172940',
  name: 'animalIdentifiers',
  within: commodityLine,
  requires: {
    anyOfIds: [
      '8f030bfa-0734-40c8-9d9e-b9e95dac4724', // microchip
      '39657a80-91a2-4fc6-8345-9f0617284a51', // passport
      '3a768b91-a2b3-4fd7-8456-a01728395b62', // tattoo
      '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73', // earTag
      '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84' // horseName
    ],
    errorCode: 'obligation.unitRecord.identifiersRequired',
    floorAppliesToParent: moreThanOne(
      allowListed(commodityCode, identifiedCommodityCodes, null)
    )
  }
}

export const microchip = {
  id: '8f030bfa-0734-40c8-9d9e-b9e95dac4724',
  name: 'animalIdentifierMicrochip',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, microchipCommodityCodes, unitRecord, [
    microchipReason
  ])
}

export const passport = {
  id: '39657a80-91a2-4fc6-8345-9f0617284a51',
  name: 'animalIdentifierPassport',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, passportCommodityCodes, unitRecord, [
    passportReason
  ])
}

export const tattoo = {
  id: '3a768b91-a2b3-4fd7-8456-a01728395b62',
  name: 'animalIdentifierTattoo',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, tattooCommodityCodes, unitRecord, [
    tattooReason
  ])
}

export const earTag = {
  id: '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73',
  name: 'animalIdentifierEarTag',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, earTagCommodityCodes, unitRecord, [
    earTagReason
  ])
}

export const horseName = {
  id: '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84',
  name: 'horseName',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, horseNameCommodityCodes, unitRecord, [
    horseNameReason
  ])
}

export const permanentAddress = {
  id: '3fcbd0e6-f708-4c2c-89ab-a56c7e8ea0b7',
  name: 'permanentAddress',
  within: unitRecord,
  status: 'mandatory',
  applyTo: allowListedPairs(
    commodityCode,
    speciesLatinName,
    permanentAddressCodeSpecies,
    unitRecord,
    [permanentAddressReason]
  )
}
