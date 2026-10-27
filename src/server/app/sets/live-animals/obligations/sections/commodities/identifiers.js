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

const MICROCHIP_ID = '8f030bfa-0734-40c8-9d9e-b9e95dac4724'
const PASSPORT_ID = '39657a80-91a2-4fc6-8345-9f0617284a51'
const TATTOO_ID = '3a768b91-a2b3-4fd7-8456-a01728395b62'
const EAR_TAG_ID = '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73'
const HORSE_NAME_ID = '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84'

export const unitRecord = {
  id: '385d6e7f-8091-4eb5-8234-8ef506172940',
  name: 'animalIdentifiers',
  within: commodityLine,
  requires: {
    anyOfIds: [MICROCHIP_ID, PASSPORT_ID, TATTOO_ID, EAR_TAG_ID, HORSE_NAME_ID],
    errorCode: 'obligation.unitRecord.identifiersRequired',
    floorAppliesToParent: moreThanOne(
      allowListed(commodityCode, identifiedCommodityCodes, null)
    )
  }
}

export const microchip = {
  id: MICROCHIP_ID,
  name: 'animalIdentifierMicrochip',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, microchipCommodityCodes, unitRecord, [
    microchipReason
  ])
}

export const passport = {
  id: PASSPORT_ID,
  name: 'animalIdentifierPassport',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, passportCommodityCodes, unitRecord, [
    passportReason
  ])
}

export const tattoo = {
  id: TATTOO_ID,
  name: 'animalIdentifierTattoo',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, tattooCommodityCodes, unitRecord, [
    tattooReason
  ])
}

export const earTag = {
  id: EAR_TAG_ID,
  name: 'animalIdentifierEarTag',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, earTagCommodityCodes, unitRecord, [
    earTagReason
  ])
}

export const horseName = {
  id: HORSE_NAME_ID,
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
