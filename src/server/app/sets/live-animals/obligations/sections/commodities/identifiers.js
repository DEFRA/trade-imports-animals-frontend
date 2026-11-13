import {
  earTagCommodityCodes,
  horseNameCodeSpecies,
  identifiedCommodityCodes,
  microchipCommodityCodes,
  passportCommodityCodes,
  permanentAddressCodeSpecies,
  tattooCommodityCodes
} from '../../../services/commodities/index.js'
import {
  allowListed,
  allowListedPairs,
  moreThanOne,
  notInUnionOf
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
  explanation:
    'horseName applies on units of lines whose commodityCode and species pair is in the horse-name list'
}

const identificationDetailsReason = {
  code: 'obligation.identificationDetails.applicable.becauseUnidentifiedCommodity',
  explanation:
    'identificationDetails applies on units of lines whose commodityCode is outside the identified list'
}

const descriptionReason = {
  code: 'obligation.description.applicable.becauseUnidentifiedCommodity',
  explanation:
    'description applies on units of lines whose commodityCode is outside the identified list'
}

const permanentAddressReason = {
  code: 'obligation.permanentAddress.applicable.becausePermanentAddressLine',
  explanation:
    'permanentAddress applies on units of lines whose commodityCode and species pair is in the permanent-address list'
}

const permanentAddressOriginReason = {
  code: 'obligation.permanentAddressOrigin.applicable.becausePermanentAddressLine',
  explanation:
    'permanentAddressOrigin applies on units of lines whose commodityCode and species pair is in the permanent-address list'
}

const MICROCHIP_ID = '8f030bfa-0734-40c8-9d9e-b9e95dac4724'
const PASSPORT_ID = '39657a80-91a2-4fc6-8345-9f0617284a51'
const TATTOO_ID = '3a768b91-a2b3-4fd7-8456-a01728395b62'
const EAR_TAG_ID = '3b879ca2-b3c4-4fe8-8567-a1283a4a6c73'
const HORSE_NAME_ID = '3c98adb3-c4d5-4ff9-8678-a2394b5b7d84'
const IDENTIFICATION_DETAILS_ID = '5a1b2c3d-4e5f-4a61-8b72-9c3d4e5f6a71'
const DESCRIPTION_ID = '5b2c3d4e-5f6a-4b72-8c83-0d4e5f6a7b82'

export const unitRecord = {
  id: '385d6e7f-8091-4eb5-8234-8ef506172940',
  name: 'animalIdentifiers',
  within: commodityLine,
  requires: {
    anyOfIds: [
      MICROCHIP_ID,
      PASSPORT_ID,
      TATTOO_ID,
      EAR_TAG_ID,
      HORSE_NAME_ID,
      IDENTIFICATION_DETAILS_ID,
      DESCRIPTION_ID
    ],
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
  applyTo: allowListedPairs(
    commodityCode,
    speciesLatinName,
    horseNameCodeSpecies,
    unitRecord,
    [horseNameReason]
  )
}

export const identificationDetails = {
  id: IDENTIFICATION_DETAILS_ID,
  name: 'identificationDetails',
  within: unitRecord,
  status: 'optional',
  applyTo: notInUnionOf(commodityCode, identifiedCommodityCodes, unitRecord, [
    identificationDetailsReason
  ])
}

export const description = {
  id: DESCRIPTION_ID,
  name: 'description',
  within: unitRecord,
  status: 'optional',
  applyTo: notInUnionOf(commodityCode, identifiedCommodityCodes, unitRecord, [
    descriptionReason
  ])
}

const permanentAddressPairGate = (reasons) =>
  allowListedPairs(
    commodityCode,
    speciesLatinName,
    permanentAddressCodeSpecies,
    unitRecord,
    reasons
  )

export const permanentAddress = {
  id: '3fcbd0e6-f708-4c2c-89ab-a56c7e8ea0b7',
  name: 'permanentAddress',
  within: unitRecord,
  status: 'mandatory',
  applyTo: permanentAddressPairGate([permanentAddressReason])
}

export const permanentAddressOrigin = {
  id: '4e1f2a3b-5c6d-4f70-8e81-9f2a3b4c5d6e',
  name: 'permanentAddressOrigin',
  within: unitRecord,
  status: 'optional',
  applyTo: permanentAddressPairGate([permanentAddressOriginReason])
}
