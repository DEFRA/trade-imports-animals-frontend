import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import { pagePath } from '../../../../../../shared/paths.js'
import {
  driveHandler,
  expectOneLogged,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import {
  COMMERCIAL,
  PRIVATE,
  parties,
  partiesFor
} from '../../../../../../services/transporters/index.js'
import {
  createTransporter,
  forgetStubTransporters
} from '../../../../../../services/transporters/stub/index.js'
import { FELIS_CATUS_ROW } from '../commodities/search/test-support.js'
import { transporterAddPage } from './page.js'
import { OWN_TRANSPORTER_TYPE_REDIRECT_MESSAGE } from './own-transporter-type.js'

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

export const expectRedirectToTransporterTypeQuestion = (response, journeyId) =>
  expect(response).toEqual({
    redirect: pagePath(journeyId, transporterAddPage.slug)
  })

const otherTransporterTypeTo = (ownType) =>
  ownType === COMMERCIAL ? PRIVATE : COMMERCIAL

/** Registers, for a transporter detail form, the GET and POST cases where the
 * notification's stored transporter type is not `ownType` — the other type,
 * and none — each asserting the redirect to the type question, nothing
 * committed, and the one redirect line logged. */
export const itOpensOnlyForOwnTransporterType = ({
  setId,
  dispatchPages,
  getHandler,
  postHandler,
  ownType,
  answerKey,
  payload
}) => {
  const otherType = otherTransporterTypeTo(ownType)
  const redirectLoggedWith = (journeyId, storedTransporterType) => ({
    level: 'info',
    fields: {
      journeyId,
      reason: 'not-own-transporter-type',
      transporterType: ownType,
      storedTransporterType
    },
    message: OWN_TRANSPORTER_TYPE_REDIRECT_MESSAGE
  })

  describe.each([
    {
      label: `the ${otherType} type stored`,
      seed: { transporterType: otherType }
    },
    { label: 'no type stored', seed: {} }
  ])(`the ${ownType} form opens only for its own type — $label`, ({ seed }) => {
    useStubbedJourney(setId, dispatchPages)

    it('Should redirect the GET to the type question, logging once', async () => {
      const result = await driveHandler(getHandler, { seed })

      expectRedirectToTransporterTypeQuestion(result.response, result.journeyId)
      expectOneLogged(
        result.logger,
        redirectLoggedWith(result.journeyId, seed.transporterType ?? 'none')
      )
    })

    it('Should redirect the POST to the type question, saving nothing and logging once', async () => {
      const result = await driveHandler(postHandler, { seed, payload })

      expectRedirectToTransporterTypeQuestion(result.response, result.journeyId)
      expect(result.after[answerKey]).toBeUndefined()
      expectOneLogged(
        result.logger,
        redirectLoggedWith(result.journeyId, seed.transporterType ?? 'none')
      )
    })
  })
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
