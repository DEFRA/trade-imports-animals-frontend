import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  authenticatedCredentials,
  driveHandler,
  expectOneRefusalLogged,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import {
  COMMERCIAL,
  NEW
} from '../../../../../../../services/transporters/index.js'
import {
  addedTransportersOf,
  expectRecoverableSaveFailureKeepingValues,
  forgetAddedTransportersAroundEachTest
} from '../test-support.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
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
  postcode: 'BT1 3LG',
  email: 'movements@lough-neagh.example.com',
  phone: '+44 28 9000 0111'
}

const handlerFor = (method) =>
  commercialTransporterDetails.routes.find((route) => route.method === method)
    .handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

describe('/transporters/add/commercial', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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
            postcode: RECORD.postcode,
            country: NORTHERN_IRELAND,
            phone: RECORD.phone,
            email: RECORD.email
          },
          approvalNumber: RECORD.approvalNumber
        }
      }
    })

    expect(result.view.context.values).toEqual(RECORD)
  })

  it('Should name the missing mandatory fields on a part-filled record', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: {
        nameOrOrganisationName: RECORD.nameOrOrganisationName,
        country: NORTHERN_IRELAND
      }
    })

    const missingFields = [
      'approvalNumber',
      'addressLine1',
      'townOrCity',
      'postcode',
      'email',
      'phone'
    ]
    expect(Object.keys(result.view.context.errors)).toEqual(missingFields)
    expect(result.after.commercialTransporter).toBeUndefined()
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: missingFields
    })
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
        postcode: RECORD.postcode,
        country: NORTHERN_IRELAND,
        phone: RECORD.phone,
        email: RECORD.email
      },
      approvalNumber: RECORD.approvalNumber
    })
    expect(result.response.redirect).toBeTruthy()
    expect(result.response.redirect).not.toContain(ADD_SLUG)
  })

  it('Should return to Check your answers after a save made from its Change link', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: { ...RECORD, country: NORTHERN_IRELAND },
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, CYA_SLUG)
    })
  })

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
    const { response } = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: { ...RECORD, country: NORTHERN_IRELAND },
      saveFailure: unavailableBackendError('save the transporter')
    })

    expectRecoverableSaveFailureKeepingValues(response, RECORD)
  })
})

describe('/transporters/add/commercial keeps the transporter for the organisation', () => {
  const ORG = authenticatedCredentials.organisationId

  const HAULIER = {
    ...RECORD,
    nameOrOrganisationName: 'Lough Neagh Livestock Haulage Ltd',
    country: NORTHERN_IRELAND
  }

  const added = () => addedTransportersOf(ORG)

  useStubbedJourney(SET_ID, dispatchPages)
  forgetAddedTransportersAroundEachTest()

  it('Should put a saved transporter on the organisation list, commercial and not yet approved', async () => {
    await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: HAULIER
    })

    expect(added()).toHaveLength(1)
    const [kept] = added()
    expect(kept.name).toBe(HAULIER.nameOrOrganisationName)
    expect(kept.type).toBe(COMMERCIAL)
    expect(kept.status).toBe(NEW)
    expect(kept.approvalNumber).toBe(HAULIER.approvalNumber)
    expect(kept.address.postcode).toBe(HAULIER.postcode)
    expect(kept.address.email).toBe(HAULIER.email)
  })

  it('Should keep nothing when the form is left blank, there being no transporter to keep', async () => {
    await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: { country: NORTHERN_IRELAND }
    })

    expect(added()).toHaveLength(0)
  })

  it('Should keep nothing when the notification refuses the save', async () => {
    await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: HAULIER,
      saveFailure: unavailableBackendError('save the transporter')
    })

    expect(added()).toHaveLength(0)
  })
})
