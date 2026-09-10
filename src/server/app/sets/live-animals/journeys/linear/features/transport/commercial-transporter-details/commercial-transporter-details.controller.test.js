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
import { COMMERCIAL } from '../../../../../../../services/transporters/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { CYA_SLUG } from '../../../../../../../shared/kit.js'
import { dispatchPages } from '../../index.js'
import { copy } from '../copy/copy.en.js'

import * as commercialTransporterDetails from './commercial-transporter-details.controller.js'

const ADD_SLUG = 'transporters/add'
const NORTHERN_IRELAND = 'Northern Ireland'
const MAX_APPROVAL_NUMBER_LENGTH = 50

const RECORD = {
  approvalNumber: 'UK/BELF/T2/00104115',
  nameOrOrganisationName: 'Lough Neagh Livestock Ltd',
  addressLine1: '4 Quay Road',
  addressLine2: '',
  townOrCity: 'Belfast',
  county: 'County Antrim',
  postalOrZipCode: 'BT1 3LG',
  emailAddress: 'movements@lough-neagh.example.com',
  telephoneNumber: '+44 28 9000 0111'
}

const handlerFor = (method) =>
  commercialTransporterDetails.routes.find((route) => route.method === method)
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
  await store.seedAnswers(journey.journeyId, { transporterType: COMMERCIAL })
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

// The commercial form is a spoke off the type question, so Back points at that
// question and a save hands the journey on from the list the add route began at.
describe('/transporters/add/commercial', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should point Back at the type question', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: COMMERCIAL }
    })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, ADD_SLUG)
    )
  })

  it('Should keep the change context on Back when the trader is changing an answer', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: COMMERCIAL },
      query: { change: '1' }
    })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, ADD_SLUG)}?change=1`
    )
  })

  // The authorisation rules are the transporter list's own sentences, shown
  // again here rather than written out a second time.
  it('Should carry the transporter-authorisation guidance and the fixed country', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: COMMERCIAL }
    })

    expect(result.view.context.guidance).toBe(copy.transporters.guidance)
    expect(result.view.context.country).toBe(NORTHERN_IRELAND)
  })

  it('Should flatten the saved record back into the form fields', async () => {
    const result = await driveHandler(getHandler, {
      seed: {
        transporterType: COMMERCIAL,
        commercialTransporter: {
          name: RECORD.nameOrOrganisationName,
          address: {
            addressLine1: RECORD.addressLine1,
            addressLine2: RECORD.addressLine2,
            townOrCity: RECORD.townOrCity,
            county: RECORD.county,
            postalOrZipCode: RECORD.postalOrZipCode,
            country: NORTHERN_IRELAND,
            telephoneNumber: RECORD.telephoneNumber,
            emailAddress: RECORD.emailAddress
          },
          approvalNumber: RECORD.approvalNumber
        }
      }
    })

    expect(result.view.context.values).toEqual(RECORD)
  })

  // The mandates apply once any of the record is given, so a part-filled form
  // names what is still missing rather than saving half a transporter.
  it('Should name the missing mandatory fields on a part-filled record', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: {
        nameOrOrganisationName: RECORD.nameOrOrganisationName,
        country: NORTHERN_IRELAND
      }
    })

    expect(Object.keys(result.view.context.errors)).toEqual([
      'approvalNumber',
      'addressLine1',
      'townOrCity',
      'postalOrZipCode',
      'emailAddress',
      'telephoneNumber'
    ])
    expect(result.after.commercialTransporter).toBeUndefined()
  })

  it('Should hold the authorisation number to its length', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: {
        ...RECORD,
        approvalNumber: 'A'.repeat(MAX_APPROVAL_NUMBER_LENGTH + 1),
        country: NORTHERN_IRELAND
      }
    })

    expect(result.view.context.errors.approvalNumber).toBe(
      copy.commercialTransporterDetails.errors.approvalNumberMaxLength
    )
    expect(result.after.commercialTransporter).toBeUndefined()
  })

  // The country is fixed rather than asked, so anything but Northern Ireland
  // has been tampered with on its way back.
  it('Should refuse a country the page did not offer', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: { ...RECORD, country: 'Switzerland' }
    })

    expect(result.view.context.errors.country).toBe(
      copy.commercialTransporterDetails.errors.countryFixed
    )
    expect(result.after.commercialTransporter).toBeUndefined()
  })

  it('Should save a hand-entered transporter in Northern Ireland and hand it on from the list', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: { ...RECORD, country: NORTHERN_IRELAND }
    })

    expect(result.after.commercialTransporter).toEqual({
      name: RECORD.nameOrOrganisationName,
      address: {
        addressLine1: RECORD.addressLine1,
        addressLine2: RECORD.addressLine2,
        townOrCity: RECORD.townOrCity,
        county: RECORD.county,
        postalOrZipCode: RECORD.postalOrZipCode,
        country: NORTHERN_IRELAND,
        telephoneNumber: RECORD.telephoneNumber,
        emailAddress: RECORD.emailAddress
      },
      approvalNumber: RECORD.approvalNumber
    })
    expect(result.response.redirect).toBeTruthy()
    expect(result.response.redirect).not.toContain(ADD_SLUG)
  })

  // A trader who reached this form by clicking Change on Check your answers is
  // returned there once they have saved, rather than dropped back into the run.
  it('Should hand a save while changing back to the summary', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: { ...RECORD, country: NORTHERN_IRELAND },
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, CYA_SLUG)
    })
  })

  // The mandates only bite once some of the record is given, so an untouched
  // form saves through unfilled rather than blocking the trader.
  it('Should walk on without saving when the form is left blank', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: { country: NORTHERN_IRELAND }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.commercialTransporter).toBeUndefined()
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should re-render the form at 500 with the answers kept after a recoverable save failure', async () => {
    const response = await driveSaveFailure({
      ...RECORD,
      country: NORTHERN_IRELAND
    })

    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.context.recoverableError).toBe(true)
    expect(response.context.values).toEqual(RECORD)
  })
})
