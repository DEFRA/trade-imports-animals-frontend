import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import { dashboardPath, pagePath } from '../../../../../../shared/paths.js'
import { CYA_SLUG, withTrail } from '../../../../../../shared/kit.js'
import {
  authenticatedCredentials,
  driveHandler,
  expectOneLogged,
  reviewChangeLinkQuery,
  useStubbedJourney,
  withFlowOnlyAnswers
} from '../../../../../../engine/test-support.js'
import { flowOnlyAnswersCookie } from '../../../../../../engine/persistence/session.js'
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
import {
  CANCEL_ACTION,
  CANCEL_LOG_MESSAGE
} from './transporter-details-save.js'
import { TRANSPORTER_ADD_IN_PROGRESS } from './transporter-add-session.js'

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

const CANCEL_PAYLOAD = Object.freeze({ action: CANCEL_ACTION })

export const itCancelsTheAddForEveryStoredType = ({
  setId,
  dispatchPages,
  postHandler,
  transporterType
}) => {
  const otherType = otherTransporterTypeTo(transporterType)

  describe.each([
    { label: 'the form’s own type stored', seed: { transporterType } },
    { label: 'the other type stored', seed: { transporterType: otherType } },
    { label: 'no type stored', seed: {} }
  ])(`cancelling the ${transporterType} form — $label`, ({ seed }) => {
    useStubbedJourney(setId, dispatchPages)
    forgetAddedTransportersAroundEachTest()

    it('Should add no transporter, commit nothing, show no error and redirect to the dashboard, logging once', async () => {
      const result = await driveHandler(postHandler, {
        seed,
        payload: CANCEL_PAYLOAD
      })

      expect(result.view).toBeUndefined()
      expect(result.response).toEqual({ redirect: dashboardPath() })
      expect(result.after).toEqual(result.before)
      expect(
        await addedTransportersOf(authenticatedCredentials.organisationId)
      ).toHaveLength(0)
      expectOneLogged(result.logger, {
        level: 'info',
        fields: {
          journeyId: result.journeyId,
          reason: 'cancelled',
          transporterType
        },
        message: CANCEL_LOG_MESSAGE
      })
    })
  })
}

export const itRemembersAndShowsARefusedSavesValues = ({
  setId,
  dispatchPages,
  getHandler,
  postHandler,
  transporterType,
  refusedPayload,
  enteredValues,
  completePayload,
  savedSeed
}) => {
  describe(`a refused ${transporterType} save remembers what was entered and shows it again`, () => {
    useStubbedJourney(setId, dispatchPages)

    it('Should remember the entered values under the form’s own type', async () => {
      const result = await driveHandler(postHandler, {
        seed: { transporterType },
        payload: refusedPayload
      })

      expect(
        result.cookies[flowOnlyAnswersCookie()][result.journeyId][
          TRANSPORTER_ADD_IN_PROGRESS
        ][transporterType]
      ).toEqual(enteredValues)
    })

    it('Should clear the entered transporter once a complete record is saved', async () => {
      const result = await driveHandler(postHandler, {
        seed: { transporterType },
        payload: completePayload,
        startingFrom: [
          withFlowOnlyAnswers({
            [TRANSPORTER_ADD_IN_PROGRESS]: { [transporterType]: enteredValues }
          })
        ]
      })

      expect(
        result.cookies[flowOnlyAnswersCookie()][result.journeyId][
          TRANSPORTER_ADD_IN_PROGRESS
        ]
      ).toEqual({})
    })

    it('Should show the entered transporter instead of the saved answer', async () => {
      const result = await driveHandler(getHandler, {
        seed: { transporterType, ...savedSeed },
        startingFrom: [
          withFlowOnlyAnswers({
            [TRANSPORTER_ADD_IN_PROGRESS]: { [transporterType]: enteredValues }
          })
        ]
      })

      expect(result.view.context.values).toEqual(enteredValues)
    })
  })
}

export const itCarriesTheTrailOnASaveFromAChangeLink = ({
  setId,
  dispatchPages,
  postHandler,
  transporterType,
  payload
}) => {
  describe(`saving the ${transporterType} form from a Change link`, () => {
    useStubbedJourney(setId, dispatchPages)

    it('Should go to the transporter list carrying the trail', async () => {
      const result = await driveHandler(postHandler, {
        seed: { transporterType },
        payload,
        startingFrom: [{ query: reviewChangeLinkQuery() }]
      })

      expect(result.response).toEqual({
        redirect: withTrail(pagePath(result.journeyId, 'transporters'), [
          CYA_SLUG
        ])
      })
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

export const itCarriesTheTrailOnBack = (getHandler, { seed = {}, backSlug }) =>
  it('Should carry the trail on Back when the trader is changing an answer', async () => {
    const result = await driveHandler(getHandler, {
      seed,
      startingFrom: [{ query: reviewChangeLinkQuery() }]
    })

    expect(result.view.context.backLink).toBe(
      withTrail(pagePath(result.journeyId, backSlug), [CYA_SLUG])
    )
  })
