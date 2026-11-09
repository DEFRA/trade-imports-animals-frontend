import { SET_ID } from '../../../../../set.js'
import { describe, expect, it, vi } from 'vitest'

import {
  authenticatedCredentials,
  driveHandler,
  refusingSaves,
  expectNoRefusalLogged,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { flowOnlyAnswersCookie } from '../../../../../../../engine/persistence/session.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import {
  COMMERCIAL,
  NEW
} from '../../../../../../../services/transporters/index.js'
import { TRANSPORTER_ADD_IN_PROGRESS } from '../transporter-add-session.js'
import { routes as transportersListRoutes } from '../transporters/transporters.controller.js'
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
import { copy } from '../copy/copy.en.js'

import * as commercialTransporterDetails from './commercial-transporter-details.controller.js'

const ADD_SLUG = 'transporters/add'
const NORTHERN_IRELAND = 'Northern Ireland'
const MAX_APPROVAL_NUMBER_LENGTH = 50
const SAVE_TRANSPORTER_OPERATION = 'save the transporter'

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

const commercialSeed = () => ({
  ...requiredEarlierAnswers(),
  transporterType: COMMERCIAL
})

const REQUIRED_FIELD_ORDER = [
  'approvalNumber',
  'nameOrOrganisationName',
  'addressLine1',
  'townOrCity',
  'postcode',
  'email',
  'phone'
]

const handlerFor = (method) =>
  commercialTransporterDetails.routes.find((route) => route.method === method)
    .handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')
const transportersListGetHandler = transportersListRoutes.find(
  (route) => route.method === 'GET'
).handler

const expectRequiredFieldsRefusal = (result) => {
  expect(Object.keys(result.view.context.errors)).toEqual(REQUIRED_FIELD_ORDER)
  expect(result.after.commercialTransporter).toBeUndefined()
  expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
  expectNoRefusalLogged(result.logger)
}

describe('/transporters/add/commercial', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should point Back at the type question', async () => {
    const result = await driveHandler(getHandler, {
      seed: commercialSeed()
    })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, ADD_SLUG)
    )
  })

  itCarriesTheTrailOnBack(getHandler, {
    seed: commercialSeed(),
    backSlug: ADD_SLUG
  })

  it('Should carry the transporter-authorisation guidance and the fixed country', async () => {
    const result = await driveHandler(getHandler, {
      seed: commercialSeed()
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

  it('Should blank every field when the saved record carries none of them', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: COMMERCIAL, commercialTransporter: {} }
    })

    expect(result.view.context.values).toEqual({
      approvalNumber: '',
      nameOrOrganisationName: '',
      addressLine1: '',
      addressLine2: '',
      townOrCity: '',
      county: '',
      postcode: '',
      email: '',
      phone: ''
    })
  })

  it('Should name the missing mandatory fields on a part-filled record', async () => {
    const result = await driveHandler(postHandler, {
      seed: commercialSeed(),
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
    expectNoRefusalLogged(result.logger)
  })

  it('Should hold the authorisation number to its length', async () => {
    const result = await driveHandler(postHandler, {
      seed: commercialSeed(),
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
      seed: commercialSeed(),
      payload: { ...RECORD, country: 'Switzerland' }
    })

    expect(result.view.context.errors.country).toBe(
      copy.commercialTransporterDetails.errors.countryFixed
    )
    expect(result.after.commercialTransporter).toBeUndefined()
  })

  it('Should save a hand-entered transporter in Northern Ireland and redirect to the transporter list', async () => {
    const result = await driveHandler(postHandler, {
      seed: commercialSeed(),
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
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'transporters')
    })
  })

  it('Should refuse a wholly blank form, naming the seven required fields in the page’s field order, and save nothing', async () => {
    const result = await driveHandler(postHandler, {
      seed: commercialSeed(),
      payload: { country: NORTHERN_IRELAND }
    })

    expectRequiredFieldsRefusal(result)
  })

  it('Should refuse a post carrying no country key with the same seven required-field messages and none for the country', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: {}
    })

    expectRequiredFieldsRefusal(result)
  })

  it('Should re-render the form at 500 with the answers kept after a recoverable save failure', async () => {
    const { response } = await driveHandler(postHandler, {
      seed: commercialSeed(),
      payload: { ...RECORD, country: NORTHERN_IRELAND },
      startingFrom: [
        refusingSaves(unavailableBackendError(SAVE_TRANSPORTER_OPERATION))
      ]
    })

    expectRecoverableSaveFailureKeepingValues(response, RECORD)
  })

  it('Should remember the entered values when the save is refused recoverably', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: { ...RECORD, country: NORTHERN_IRELAND },
      startingFrom: [
        refusingSaves(unavailableBackendError(SAVE_TRANSPORTER_OPERATION))
      ]
    })

    expect(
      result.cookies[flowOnlyAnswersCookie()][result.journeyId][
        TRANSPORTER_ADD_IN_PROGRESS
      ][COMMERCIAL]
    ).toEqual(RECORD)
  })

  it('Should show no success banner and no chosen transporter on the list when only the address-book write fails', async () => {
    const UNSAVED_RECORD = {
      ...RECORD,
      nameOrOrganisationName: 'Not Actually Saved Haulage Ltd'
    }
    const saveTransporter = vi
      .spyOn(transporters, 'saveTransporter')
      .mockRejectedValue(unavailableBackendError(SAVE_TRANSPORTER_OPERATION))

    try {
      const result = await driveHandler(postHandler, {
        seed: { transporterType: COMMERCIAL },
        payload: { ...UNSAVED_RECORD, country: NORTHERN_IRELAND }
      })

      expectRecoverableSaveFailureKeepingValues(result.response, UNSAVED_RECORD)

      const listResult = await driveHandler(transportersListGetHandler, {
        journeyId: result.journeyId,
        seed: result.after,
        state: result.cookies
      })

      expect(listResult.view.context.successBanner).toBeNull()
      expect(listResult.view.context.selectedId).toBeUndefined()
    } finally {
      saveTransporter.mockRestore()
    }
  })
})

itOpensOnlyForOwnTransporterType({
  setId: SET_ID,
  dispatchPages,
  getHandler,
  postHandler,
  ownType: COMMERCIAL,
  answerKey: 'commercialTransporter',
  payload: { ...RECORD, country: NORTHERN_IRELAND }
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
      seed: commercialSeed(),
      payload: HAULIER
    })

    const [kept, ...rest] = await added()
    expect(rest).toHaveLength(0)
    expect(kept.name).toBe(HAULIER.nameOrOrganisationName)
    expect(kept.type).toBe(COMMERCIAL)
    expect(kept.status).toBe(NEW)
    expect(kept.approvalNumber).toBe(HAULIER.approvalNumber)
    expect(kept.address.postcode).toBe(HAULIER.postcode)
    expect(kept.address.email).toBe(HAULIER.email)
  })

  it('Should store the fixed country as the code the address book holds it under', async () => {
    await driveHandler(postHandler, {
      seed: { transporterType: COMMERCIAL },
      payload: HAULIER
    })

    const [kept] = await added()
    expect(kept.address.countryCode).toBe('GB-NIR')
  })

  it('Should keep nothing when a wholly blank form is refused', async () => {
    await driveHandler(postHandler, {
      seed: commercialSeed(),
      payload: { country: NORTHERN_IRELAND }
    })

    expect(await added()).toHaveLength(0)
  })

  it('Should keep nothing when the notification refuses the save', async () => {
    await driveHandler(postHandler, {
      seed: commercialSeed(),
      payload: HAULIER,
      startingFrom: [
        refusingSaves(unavailableBackendError(SAVE_TRANSPORTER_OPERATION))
      ]
    })

    expect(await added()).toHaveLength(0)
  })
})

itCancelsTheAddForEveryStoredType({
  setId: SET_ID,
  dispatchPages,
  postHandler,
  transporterType: COMMERCIAL
})

itCarriesTheTrailOnASaveFromAChangeLink({
  setId: SET_ID,
  dispatchPages,
  postHandler,
  transporterType: COMMERCIAL,
  payload: { ...RECORD, country: NORTHERN_IRELAND }
})

itRemembersAndShowsARefusedSavesValues({
  setId: SET_ID,
  dispatchPages,
  getHandler,
  postHandler,
  transporterType: COMMERCIAL,
  refusedPayload: { ...RECORD, country: NORTHERN_IRELAND, approvalNumber: '' },
  enteredValues: { ...RECORD, approvalNumber: '' },
  completePayload: { ...RECORD, country: NORTHERN_IRELAND },
  savedSeed: {
    commercialTransporter: {
      name: RECORD.nameOrOrganisationName,
      approvalNumber: RECORD.approvalNumber,
      address: { addressLine1: RECORD.addressLine1 }
    }
  }
})
