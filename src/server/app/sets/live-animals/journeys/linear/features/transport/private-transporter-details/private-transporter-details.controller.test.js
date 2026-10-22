import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  authenticatedCredentials,
  driveHandler,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import {
  NEW,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import {
  addedTransportersOf,
  expectRecoverableSaveFailureKeepingValues,
  forgetAddedTransportersAroundEachTest
} from '../test-support.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { dispatchPages } from '../../index.js'

import * as privateTransporterDetails from './private-transporter-details.controller.js'

const ADD_SLUG = 'transporters/add'

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

  it('Should keep the change context on Back when the trader is changing an answer', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: PRIVATE },
      query: { change: '1' }
    })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, ADD_SLUG)}?change=1`
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

    expect(Object.keys(result.view.context.errors)).toEqual([
      'addressLine1',
      'townOrCity',
      'postcode',
      'country',
      'email',
      'phone'
    ])
    expect(result.after.privateTransporter).toBeUndefined()
  })

  it('Should hand a saved record on from the transporter list', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: RECORD
    })

    expect(result.after.privateTransporter.name).toBe(
      RECORD.nameOrOrganisationName
    )
    expect(result.after.privateTransporter.address.postcode).toBe(
      RECORD.postcode
    )
    expect(result.response.redirect).toBeTruthy()
    expect(result.response.redirect).not.toContain(ADD_SLUG)
  })

  it('Should walk on without saving when the form is left blank', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: {}
    })

    expect(result.view).toBeUndefined()
    expect(result.after.privateTransporter).toBeUndefined()
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should re-render the form at 500 with the answers kept after a recoverable save failure', async () => {
    const { response } = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: RECORD,
      saveFailure: unavailableBackendError('save the transporter')
    })

    expectRecoverableSaveFailureKeepingValues(response, RECORD)
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

    expect(added()).toHaveLength(1)
    const [kept] = added()
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

    expect(added()).toHaveLength(0)
  })

  it('Should keep nothing when the notification refuses the save', async () => {
    await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: UNSHIPPED_HAULIER,
      saveFailure: unavailableBackendError('save the transporter')
    })

    expect(added()).toHaveLength(0)
  })
})

describe('GET /transporters/add/private — a stored country the reader no longer offers', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should blank the country in values so the select renders unselected, without adding the stale option', async () => {
    const result = await driveHandler(getHandler, { seed: staleSeed })

    expect(result.view.context.values.country).toBe('')
    expect(
      result.view.context.countryItems.find(
        (item) => item.value === STALE_COUNTRY
      )
    ).toBeUndefined()
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
