import { afterEach, beforeEach, expect } from 'vitest'

import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import {
  parties,
  partiesFor
} from '../../../../../../services/transporters/index.js'
import {
  createTransporter,
  forgetStubTransporters
} from '../../../../../../services/transporters/stub/index.js'
import { FELIS_CATUS_ROW } from '../commodities/search/test-support.js'

export const transitAppliesSeed = Object.freeze({
  countryOfOrigin: 'FR',
  commodityLines: [FELIS_CATUS_ROW],
  meansOfTransport: 'ROAD_VEHICLE'
})

export const transitAppliesSeedWithout = (answerName, overrides = {}) => {
  const answers = { ...transitAppliesSeed, ...overrides }
  delete answers[answerName]
  return answers
}

export const addedTransportersOf = async (organisationId) => {
  const available = await partiesFor(organisationId)
  return available.filter(
    (record) => !parties().some((shipped) => shipped.id === record.id)
  )
}

/** Seeds a transporter in the organisation's address book, in the wire shape
 * the address book's own API returns — the repo's unit suite runs in stub
 * mode (`vitest.config.js` sets `STUB_MODE`), so this is the store
 * `partiesFor` and `saveTransporter` read and write there.
 *
 * @returns {Promise<object>} the stored transporter, with its assigned id
 */
export const seedOrganisationTransporter = (organisationId, wireTransporter) =>
  createTransporter(organisationId, wireTransporter)

export const forgetAddedTransportersAroundEachTest = () => {
  beforeEach(forgetStubTransporters)
  afterEach(forgetStubTransporters)
}

export const expectRecoverableSaveFailureKeepingValues = (
  response,
  values,
  { keptIn = (context) => context.values } = {}
) => {
  expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  expect(response.context.recoverableError).toBe(true)
  expect(keptIn(response.context)).toEqual(values)
}

export const typedInCommercialTransporterPayload = Object.freeze({
  approvalNumber: 'UK/BELF/T2/00104115',
  nameOrOrganisationName: 'Lough Neagh Livestock Ltd',
  addressLine1: '4 Quay Road',
  addressLine2: '',
  townOrCity: 'Belfast',
  county: 'County Antrim',
  postcode: 'BT1 3LG',
  country: 'Northern Ireland',
  email: 'movements@lough-neagh.example.com',
  phone: '+44 28 9000 0111'
})

export const typedInPrivateTransporterPayload = Object.freeze({
  nameOrOrganisationName: 'Jean Dupont',
  addressLine1: '12 Rue des Fermes',
  addressLine2: '',
  townOrCity: 'Amiens',
  county: '',
  postcode: '80000',
  country: 'France',
  phone: '+33 3 22 55 01 44',
  email: 'jean.dupont@example.fr'
})
