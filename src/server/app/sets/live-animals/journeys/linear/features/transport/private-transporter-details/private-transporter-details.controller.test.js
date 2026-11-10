import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  authenticatedCredentials,
  driveHandler,
  refusingSaves,
  expectNoRefusalLogged,
  unavailableBackendError,
  useStubbedJourney,
  withFlowOnlyAnswers
} from '../../../../../../../engine/test-support.js'
import { flowOnlyAnswersCookie } from '../../../../../../../engine/persistence/session.js'
import * as countries from '../../../../../../../services/countries/index.js'
import {
  NEW,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import { TRANSPORTER_ADD_IN_PROGRESS } from '../transporter-add-session.js'
import {
  addedTransportersOf,
  expectRecoverableSaveFailureKeepingValues,
  forgetAddedTransportersAroundEachTest,
  itCancelsTheAddForEveryStoredType,
  itCarriesTheTrailOnASaveFromAChangeLink,
  itCarriesTheTrailOnBack,
  itOpensOnlyForOwnTransporterType,
  itRemembersAndShowsARefusedSavesValues
} from '../test-support.js'
import { requiredEarlierAnswers } from '../../../../../test-support.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { dispatchPages } from '../../index.js'

import * as privateTransporterDetails from './private-transporter-details.controller.js'

const ADD_SLUG = 'transporters/add'
const SAVE_TRANSPORTER_OPERATION = 'save the transporter'

const RECORD = {
  nameOrOrganisationName: 'Aberdeen Livestock Ltd',
  addressLine1: '12 Harbour Road',
  addressLine2: '',
  townOrCity: 'Aberdeen',
  county: 'Aberdeenshire',
  postcode: 'AB11 5DQ',
  country: 'United Kingdom',
  phone: '+44 1224 000 111',
  email: 'movements@aberdeen-livestock.example.com'
}

const privateSeed = () => ({
  ...requiredEarlierAnswers(),
  transporterType: PRIVATE
})

const BLANK_RECORD = Object.fromEntries(
  Object.keys(RECORD).map((field) => [field, ''])
)

const STALE_COUNTRY = 'Zedland'

const staleSeed = {
  transporterType: PRIVATE,
  privateTransporter: {
    name: RECORD.nameOrOrganisationName,
    address: {
      addressLine1: RECORD.addressLine1,
      addressLine2: RECORD.addressLine2,
      townOrCity: RECORD.townOrCity,
      county: RECORD.county,
      postcode: RECORD.postcode,
      country: STALE_COUNTRY,
      phone: RECORD.phone,
      email: RECORD.email
    }
  }
}

const handlerFor = (method) =>
  privateTransporterDetails.routes.find((route) => route.method === method)
    .handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

describe('/transporters/add/private', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should point Back at the type question', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: PRIVATE }
    })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, ADD_SLUG)
    )
  })

  itCarriesTheTrailOnBack(getHandler, {
    seed: { transporterType: PRIVATE },
    backSlug: ADD_SLUG
  })

  it('Should open a fresh GET’s select on the United Kingdom, offering nothing but the offered countries in order', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: PRIVATE }
    })

    const offered = await countries.addressCountries()
    expect(result.view.context.countryItems).toEqual(
      offered.map((name) => ({
        value: name,
        text: name,
        selected: name === countries.UNITED_KINGDOM
      }))
    )
  })

  it('Should flatten the saved record back into the form fields', async () => {
    const result = await driveHandler(getHandler, {
      seed: {
        transporterType: PRIVATE,
        privateTransporter: {
          name: RECORD.nameOrOrganisationName,
          address: {
            addressLine1: RECORD.addressLine1,
            addressLine2: RECORD.addressLine2,
            townOrCity: RECORD.townOrCity,
            county: RECORD.county,
            postcode: RECORD.postcode,
            country: RECORD.country,
            phone: RECORD.phone,
            email: RECORD.email
          }
        }
      }
    })

    expect(result.view.context.values).toEqual(RECORD)
  })

  it('Should name the missing mandatory fields on a part-filled record', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: { nameOrOrganisationName: RECORD.nameOrOrganisationName }
    })

    const missingFields = [
      'addressLine1',
      'townOrCity',
      'postcode',
      'country',
      'email',
      'phone'
    ]
    expect(Object.keys(result.view.context.errors)).toEqual(missingFields)
    expect(result.after.privateTransporter).toBeUndefined()
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectNoRefusalLogged(result.logger)
  })

  it('Should save the record and redirect to the transporter list', async () => {
    const result = await driveHandler(postHandler, {
      seed: privateSeed(),
      payload: RECORD
    })

    expect(result.after.privateTransporter.name).toBe(
      RECORD.nameOrOrganisationName
    )
    expect(result.after.privateTransporter.address.postcode).toBe(
      RECORD.postcode
    )
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'transporters')
    })
  })

  it('Should refuse a wholly blank form, naming the six required fields in the page’s field order, and save nothing', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: { country: countries.UNITED_KINGDOM }
    })

    const requiredFields = [
      'nameOrOrganisationName',
      'addressLine1',
      'townOrCity',
      'postcode',
      'email',
      'phone'
    ]
    expect(Object.keys(result.view.context.errors)).toEqual(requiredFields)
    expect(result.after.privateTransporter).toBeUndefined()
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectNoRefusalLogged(result.logger)
  })

  it('Should refuse a form posted blank in every field, naming the country alongside the other required fields, and save nothing', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: {}
    })

    expect(Object.keys(result.view.context.errors)).toEqual([
      'nameOrOrganisationName',
      'addressLine1',
      'townOrCity',
      'postcode',
      'country',
      'email',
      'phone'
    ])
    expect(result.after.privateTransporter).toBeUndefined()
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectNoRefusalLogged(result.logger)
  })

  it('Should re-render the form at 500 with the answers kept after a recoverable save failure', async () => {
    const { response } = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: RECORD,
      startingFrom: [
        refusingSaves(unavailableBackendError(SAVE_TRANSPORTER_OPERATION))
      ]
    })

    expectRecoverableSaveFailureKeepingValues(response, RECORD)
  })

  it('Should remember the entered values when the save is refused recoverably', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: RECORD,
      startingFrom: [
        refusingSaves(unavailableBackendError(SAVE_TRANSPORTER_OPERATION))
      ]
    })

    expect(
      result.cookies[flowOnlyAnswersCookie()][result.journeyId][
        TRANSPORTER_ADD_IN_PROGRESS
      ][PRIVATE]
    ).toEqual(RECORD)
  })
})

describe('/transporters/add/private keeps the transporter for the organisation', () => {
  const ORG = authenticatedCredentials.organisationId

  const UNSHIPPED_HAULIER = {
    ...RECORD,
    nameOrOrganisationName: 'Dupont Transport SARL'
  }

  const added = () => addedTransportersOf(ORG)

  useStubbedJourney(SET_ID, dispatchPages)
  forgetAddedTransportersAroundEachTest()

  it('Should put a saved transporter on the organisation list, private and not yet approved', async () => {
    await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: UNSHIPPED_HAULIER
    })

    const [kept, ...rest] = await added()
    expect(rest).toHaveLength(0)
    expect(kept.name).toBe(UNSHIPPED_HAULIER.nameOrOrganisationName)
    expect(kept.type).toBe(PRIVATE)
    expect(kept.status).toBe(NEW)
    expect(kept.address.postcode).toBe(UNSHIPPED_HAULIER.postcode)
    expect(kept.address.email).toBe(UNSHIPPED_HAULIER.email)
  })

  it('Should keep nothing when the form is left blank, there being no transporter to keep', async () => {
    await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: {}
    })

    expect(await added()).toHaveLength(0)
  })

  it('Should keep nothing when the notification refuses the save', async () => {
    await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: UNSHIPPED_HAULIER,
      startingFrom: [
        refusingSaves(unavailableBackendError(SAVE_TRANSPORTER_OPERATION))
      ]
    })

    expect(await added()).toHaveLength(0)
  })
})

describe('GET /transporters/add/private — a stored country the reader no longer offers', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should blank the country in values, offer no option for the stale country, and open the select on the United Kingdom', async () => {
    const result = await driveHandler(getHandler, { seed: staleSeed })

    expect(result.view.context.values.country).toBe('')
    expect(
      result.view.context.countryItems.find(
        (item) => item.value === STALE_COUNTRY
      )
    ).toBeUndefined()
    expect(
      result.view.context.countryItems.find((item) => item.selected)
    ).toMatchObject({ value: countries.UNITED_KINGDOM })
  })

  it('Should surface a country-no-longer-available error on the country field', async () => {
    const result = await driveHandler(getHandler, { seed: staleSeed })

    expect(result.view.context.errors.country).toBe(
      'The saved country is no longer available. Select a country from the list.'
    )
  })

  it('Should leave the stored transporter intact — GET only reshapes what the page renders', async () => {
    const result = await driveHandler(getHandler, { seed: staleSeed })

    expect(result.before.privateTransporter.address.country).toBe(STALE_COUNTRY)
    expect(result.after.privateTransporter.address.country).toBe(STALE_COUNTRY)
  })
})

itOpensOnlyForOwnTransporterType({
  setId: SET_ID,
  dispatchPages,
  getHandler,
  postHandler,
  ownType: PRIVATE,
  answerKey: 'privateTransporter',
  payload: RECORD
})

describe('POST /transporters/add/private — an empty country from a part-filled record is refused, not silently wiped', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should refuse the save with a country-required error and preserve the stored transporter', async () => {
    const result = await driveHandler(postHandler, {
      seed: staleSeed,
      payload: { ...RECORD, country: '' }
    })

    expect(result.view.context.errors.country).toBeDefined()
    expect(result.after.privateTransporter.address.country).toBe(STALE_COUNTRY)
  })
})

itCancelsTheAddForEveryStoredType({
  setId: SET_ID,
  dispatchPages,
  postHandler,
  transporterType: PRIVATE
})

itCarriesTheTrailOnASaveFromAChangeLink({
  setId: SET_ID,
  dispatchPages,
  postHandler,
  transporterType: PRIVATE,
  payload: RECORD
})

itRemembersAndShowsARefusedSavesValues({
  setId: SET_ID,
  dispatchPages,
  getHandler,
  postHandler,
  transporterType: PRIVATE,
  refusedPayload: { ...RECORD, country: '' },
  enteredValues: { ...RECORD, country: '' },
  completePayload: RECORD,
  savedSeed: { privateTransporter: staleSeed.privateTransporter }
})

describe('POST /transporters/add/private — a refused save remembers what was entered', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should remember the blank values submitted under the private type, rather than clearing them', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: {},
      startingFrom: [
        withFlowOnlyAnswers({
          [TRANSPORTER_ADD_IN_PROGRESS]: {
            [PRIVATE]: { ...RECORD, country: '' }
          }
        })
      ]
    })

    expect(
      result.cookies[flowOnlyAnswersCookie()][result.journeyId][
        TRANSPORTER_ADD_IN_PROGRESS
      ][PRIVATE]
    ).toEqual(BLANK_RECORD)
  })
})

describe('GET /transporters/add/private — showing a refused save’s entered values', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should refuse a kept country the reader no longer offers the same way as a saved one', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: PRIVATE },
      startingFrom: [
        withFlowOnlyAnswers({
          [TRANSPORTER_ADD_IN_PROGRESS]: {
            [PRIVATE]: { ...RECORD, country: STALE_COUNTRY }
          }
        })
      ]
    })

    expect(result.view.context.values.country).toBe('')
    expect(result.view.context.errors.country).toBe(
      'The saved country is no longer available. Select a country from the list.'
    )
  })
})
