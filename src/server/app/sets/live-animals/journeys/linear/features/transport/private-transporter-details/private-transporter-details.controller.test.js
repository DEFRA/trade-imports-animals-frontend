import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { BackendRequestError } from '../../../../../../../services/persistence/records/errors.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  stubH
} from '../../../../../../../engine/test-support.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'
import { PRIVATE } from '../../../../../../../services/transporters/index.js'
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
  postalOrZipCode: 'AB11 5DQ',
  country: 'United Kingdom',
  telephoneNumber: '+44 1224 000 111',
  emailAddress: 'movements@aberdeen-livestock.example.com'
}

const handlerFor = (method) =>
  privateTransporterDetails.routes.find((route) => route.method === method)
    .handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

/** Drive a POST whose save fails the way a backend outage fails it: recoverably,
 * so the form comes back with the banner rather than throwing. */
const driveSaveFailure = async (payload) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, { transporterType: PRIVATE })
  const h = stubH()
  configureRecords({
    ...recordsStub,
    replaceFulfilment: () => {
      throw new BackendRequestError('save the transporter', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    }
  })
  try {
    return await postHandler(journeyRequest(journey.journeyId, { payload }), h)
  } finally {
    configureRecords(recordsStub)
  }
}

// The private form is a spoke off the type question, so Back points at that
// question and a save hands the journey on from the list the add route began at.
describe('/transporters/add/private', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

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
            postalOrZipCode: RECORD.postalOrZipCode,
            country: RECORD.country,
            telephoneNumber: RECORD.telephoneNumber,
            emailAddress: RECORD.emailAddress
          }
        }
      }
    })

    expect(result.view.context.values).toEqual(RECORD)
  })

  // The mandates apply once any of the record is given, so a part-filled form
  // names what is still missing rather than saving half a transporter.
  it('Should name the missing mandatory fields on a part-filled record', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: { nameOrOrganisationName: RECORD.nameOrOrganisationName }
    })

    expect(Object.keys(result.view.context.errors)).toEqual([
      'addressLine1',
      'townOrCity',
      'postalOrZipCode',
      'country',
      'telephoneNumber',
      'emailAddress'
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
    expect(result.after.privateTransporter.address.postalOrZipCode).toBe(
      RECORD.postalOrZipCode
    )
    expect(result.response.redirect).toBeTruthy()
    expect(result.response.redirect).not.toContain(ADD_SLUG)
  })

  // The mandates only bite once some of the record is given, so an untouched
  // form saves through unfilled rather than blocking the trader.
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
    const response = await driveSaveFailure(RECORD)

    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.context.recoverableError).toBe(true)
    expect(response.context.values).toEqual(RECORD)
  })
})
