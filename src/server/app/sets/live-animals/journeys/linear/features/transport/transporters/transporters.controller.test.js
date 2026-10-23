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
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  COMMERCIAL,
  NEW,
  PRIVATE,
  parties,
  rememberTransporter
} from '../../../../../../../services/transporters/index.js'
import { hubPath } from '../../../../../../../shared/paths.js'
import { dispatchPages } from '../../index.js'
import {
  expectRecoverableSaveFailureKeepingValues,
  forgetAddedTransportersAroundEachTest
} from '../test-support.js'

import * as transporters from './transporters.controller.js'

const GARCIA_ID = 'garcia-livestock-transport'
const GARCIA_NAME = 'García Livestock Transport SL'
const ABERDEEN_ID = 'aberdeen-livestock'
const ABERDEEN_NAME = 'Aberdeen Livestock Ltd'
const ROMANIAN_ID = 'romanian-agri-exports'
const NOT_ON_THE_LIST = 'not-a-transporter'

const handlerFor = (method) =>
  transporters.routes.find((route) => route.method === method).handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

const rowFor = (context, id) =>
  context.transporterRows.find((row) => row.id === id)

const checkedRowIdsOf = (context) =>
  context.transporterRows.filter((row) => row.checked).map((row) => row.id)

describe('/transporters', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should offer both kinds of transporter on the one list, each row saying which it is', async () => {
    const result = await driveHandler(getHandler)

    const garcia = rowFor(result.view.context, GARCIA_ID)
    const aberdeen = rowFor(result.view.context, ABERDEEN_ID)
    expect(garcia.name).toBe(GARCIA_NAME)
    expect(garcia.type).toBe(COMMERCIAL)
    expect(garcia.approvalNumber).toBe('ES-T2-45001294')
    expect(aberdeen.name).toBe(ABERDEEN_NAME)
    expect(aberdeen.type).toBe(PRIVATE)
  })

  it('Should give every row a column for each fact the list shows', async () => {
    const result = await driveHandler(getHandler)

    const garcia = rowFor(result.view.context, GARCIA_ID)
    expect(garcia.addressText).toBe(
      '43 East Hague Extension, Delectus sitodio p. Laborum Odio tempor, Quasoccaecat ut ear, 30055, Switzerland'
    )
    expect(rowFor(result.view.context, ABERDEEN_ID).approvalNumber).toBe('')
  })

  it('Should tag an approved transporter green and a newly added one pink', async () => {
    const result = await driveHandler(getHandler)

    expect(rowFor(result.view.context, GARCIA_ID).status).toEqual({
      text: 'Approved',
      classes: 'govuk-tag--green'
    })
    expect(rowFor(result.view.context, ROMANIAN_ID).status).toEqual({
      text: 'New',
      classes: 'govuk-tag--magenta'
    })
  })

  it('Should give the first row the field id and every other row a unique one', async () => {
    const result = await driveHandler(getHandler)

    const prefixes = result.view.context.transporterRows.map(
      (row) => row.idPrefix
    )
    expect(prefixes[0]).toBe('transporter')
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })

  it('Should leave every transporter unchecked before one is picked', async () => {
    const result = await driveHandler(getHandler)

    expect(
      result.view.context.transporterRows.every((row) => !row.checked)
    ).toBe(true)
  })

  it('Should re-check the commercial transporter already on the notification', async () => {
    const result = await driveHandler(getHandler, {
      seed: {
        transporterType: COMMERCIAL,
        commercialTransporter: { name: GARCIA_NAME }
      }
    })

    expect(rowFor(result.view.context, GARCIA_ID).checked).toBe(true)
  })

  it('Should re-check the private transporter already on the notification', async () => {
    const result = await driveHandler(getHandler, {
      seed: {
        transporterType: PRIVATE,
        privateTransporter: { name: ABERDEEN_NAME }
      }
    })

    expect(rowFor(result.view.context, ABERDEEN_ID).checked).toBe(true)
  })

  it('Should reject a transporter that is not on the list', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporter: NOT_ON_THE_LIST }
    })

    expect(result.view.context.errors.transporter).toBeTruthy()
    expect(result.view.context.errorSummary.errorList).toHaveLength(1)
    expect(result.after.transporterType).toBeUndefined()
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['transporter']
    })
  })

  it('Should save the type off the record when a commercial transporter is picked', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'save', transporter: GARCIA_ID }
    })

    expect(result.after.transporterType).toBe(COMMERCIAL)
    expect(result.after.commercialTransporter.name).toBe(GARCIA_NAME)
    expect(result.after.commercialTransporter.approvalNumber).toBe(
      'ES-T2-45001294'
    )
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should save the type off the record when a private transporter is picked', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'save', transporter: ABERDEEN_ID }
    })

    expect(result.after.transporterType).toBe(PRIVATE)
    expect(result.after.privateTransporter.name).toBe(ABERDEEN_NAME)
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should walk on without saving when no transporter is picked', async () => {
    const result = await driveHandler(postHandler, { payload: {} })

    expect(result.after.transporterType).toBeUndefined()
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should re-render the list at 500 with the pick kept after a recoverable save failure', async () => {
    const { response } = await driveHandler(postHandler, {
      payload: { transporter: GARCIA_ID },
      saveFailure: unavailableBackendError('save the transporter')
    })

    expectRecoverableSaveFailureKeepingValues(response, [GARCIA_ID], {
      keptIn: checkedRowIdsOf
    })
  })

  it('Should keep the search term in the box and narrow the list to it after a recoverable save failure', async () => {
    const { response } = await driveHandler(postHandler, {
      payload: {
        action: 'save',
        search: 'aberdeen',
        transporter: ABERDEEN_ID
      },
      saveFailure: unavailableBackendError('save the transporter')
    })

    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.context.query).toBe('aberdeen')
    expect(response.context.transporterRows.map((row) => row.id)).toEqual([
      ABERDEEN_ID
    ])
  })
})

describe('/transporters — Save and return to overview', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should go to the overview, not the next page, and commit nothing when no transporter is picked', async () => {
    const result = await driveHandler(postHandler, {
      payload: { exit: 'hub' }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a transporter that is not on the list and save nothing', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporter: NOT_ON_THE_LIST, exit: 'hub' }
    })

    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errors.transporter).toBeTruthy()
    expect(result.after).toEqual(result.before)
  })
})

describe('/transporters — searching the list', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should filter the list to the transporters matching the search', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'search', search: 'aberdeen' }
    })

    expect(result.view.context.transporterRows.map((row) => row.id)).toEqual([
      ABERDEEN_ID
    ])
    expect(result.view.context.query).toBe('aberdeen')
    expect(result.response.redirect).toBeFalsy()
  })

  it('Should commit nothing when the list is searched', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'search', search: 'aberdeen', transporter: GARCIA_ID }
    })

    expect(result.after.transporterType).toBeUndefined()
    expect(result.after.privateTransporter).toBeUndefined()
  })

  it('Should keep the row the trader had picked checked when the search leaves it on the list', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'search', search: 'garcia', transporter: GARCIA_ID }
    })

    expect(rowFor(result.view.context, GARCIA_ID).checked).toBe(true)
  })

  it('Should keep the pick when the search that filtered its row off is cleared', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'search', search: '', selected: GARCIA_ID }
    })

    expect(rowFor(result.view.context, GARCIA_ID).checked).toBe(true)
    expect(result.view.context.selectedId).toBe(GARCIA_ID)
  })

  it('Should re-check the transporter already on the notification when the list is searched', async () => {
    const result = await driveHandler(postHandler, {
      seed: {
        transporterType: COMMERCIAL,
        commercialTransporter: { name: GARCIA_NAME }
      },
      payload: { action: 'search', search: 'garcia' }
    })

    expect(rowFor(result.view.context, GARCIA_ID).checked).toBe(true)
  })

  it('Should give the first matching row the field id', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'search', search: 'aberdeen' }
    })

    expect(result.view.context.transporterRows[0].idPrefix).toBe('transporter')
  })

  it('Should leave no rows when nothing matches the search', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'search', search: 'no such transporter' }
    })

    expect(result.view.context.transporterRows).toEqual([])
  })

  it('Should survive a repeated search key rather than throwing', async () => {
    const result = await driveHandler(postHandler, {
      payload: { action: 'search', search: ['aberdeen', 'garcia'] }
    })

    expect(typeof result.view.context.query).toBe('string')
    expect(result.view.context.transporterRows).toEqual([])
  })

  it('Should keep the search term in the box and narrow the list to it when the pick fails validation', async () => {
    const result = await driveHandler(postHandler, {
      payload: { search: 'aberdeen', transporter: NOT_ON_THE_LIST }
    })

    expect(result.view.context.errors.transporter).toBeTruthy()
    expect(result.view.context.query).toBe('aberdeen')
    expect(result.view.context.transporterRows.map((row) => row.id)).toEqual([
      ABERDEEN_ID
    ])
  })

  it('Should point the error summary at the search box when nothing matched', async () => {
    const result = await driveHandler(postHandler, {
      payload: {
        action: 'save',
        search: 'no such transporter',
        transporter: NOT_ON_THE_LIST
      }
    })

    expect(result.view.context.errorSummary.errorList[0].href).toBe('#search')
  })

  it('Should point the error summary at the first row when the list still has one', async () => {
    const result = await driveHandler(postHandler, {
      payload: {
        action: 'save',
        search: 'aberdeen',
        transporter: NOT_ON_THE_LIST
      }
    })

    expect(result.view.context.errorSummary.errorList[0].href).toBe(
      '#transporter'
    )
  })

  it('Should refuse a no-JS save of a transporter not on the list when the search matches nothing, show no rows and link the summary to the search box', async () => {
    const result = await driveHandler(postHandler, {
      payload: { search: 'zzz', transporter: NOT_ON_THE_LIST }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.transporterRows).toEqual([])
    expect(result.view.context.errorSummary.errorList[0].href).toBe('#search')
  })

  it('Should refuse a no-JS save of a transporter not on the list when the search matches one row, show only that row and link the summary to the transporters', async () => {
    const result = await driveHandler(postHandler, {
      payload: { search: 'aberdeen', transporter: NOT_ON_THE_LIST }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.transporterRows.map((row) => row.id)).toEqual([
      ABERDEEN_ID
    ])
    expect(result.view.context.errorSummary.errorList[0].href).toBe(
      '#transporter'
    )
  })

  it('Should show the whole list before anything is searched for', async () => {
    const result = await driveHandler(getHandler)

    expect(result.view.context.query).toBe('')
    expect(result.view.context.transporterRows.length).toBeGreaterThan(1)
  })
})

describe('/transporters with a transporter the organisation added', () => {
  const ORG = authenticatedCredentials.organisationId
  const ANOTHER_ORG = '5900002'
  const HAULIER_NAME = 'Dupont Transport SARL'

  const haulier = () => ({
    type: PRIVATE,
    status: NEW,
    name: HAULIER_NAME,
    address: {
      addressLine1: '10 Rue de la Ferme',
      addressLine2: '',
      townOrCity: 'Calais',
      county: 'Pas-de-Calais',
      postcode: '62100',
      country: 'France',
      phone: '+33 3 21 00 00 00',
      email: 'transport@dupont.example.fr'
    }
  })

  useStubbedJourney(SET_ID, dispatchPages)
  forgetAddedTransportersAroundEachTest()

  it('Should show it at the top of the list, typed and tagged like any other row', async () => {
    const kept = rememberTransporter(ORG, haulier())

    const result = await driveHandler(getHandler)

    const [first] = result.view.context.transporterRows
    expect(first.id).toBe(kept.id)
    expect(first.name).toBe(HAULIER_NAME)
    expect(first.type).toBe(PRIVATE)
    expect(first.status).toEqual({ text: 'New', classes: 'govuk-tag--magenta' })
    expect(first.approvalNumber).toBe('')
  })

  it('Should leave the shipped register on the list behind it', async () => {
    rememberTransporter(ORG, haulier())

    const result = await driveHandler(getHandler)

    expect(rowFor(result.view.context, GARCIA_ID).name).toBe(GARCIA_NAME)
    expect(rowFor(result.view.context, ABERDEEN_ID).name).toBe(ABERDEEN_NAME)
  })

  it('Should accept a pick of it and save it the way it saves any private transporter', async () => {
    const kept = rememberTransporter(ORG, haulier())

    const result = await driveHandler(postHandler, {
      payload: { action: 'save', transporter: kept.id }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.transporterType).toBe(PRIVATE)
    expect(result.after.privateTransporter.name).toBe(HAULIER_NAME)
    expect(result.after.privateTransporter.address.townOrCity).toBe('Calais')
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should re-check it on a notification that already names it', async () => {
    const kept = rememberTransporter(ORG, haulier())

    const result = await driveHandler(getHandler, {
      seed: {
        transporterType: PRIVATE,
        privateTransporter: { name: HAULIER_NAME }
      }
    })

    expect(rowFor(result.view.context, kept.id).checked).toBe(true)
  })

  it('Should find it by name when the list is searched', async () => {
    const kept = rememberTransporter(ORG, haulier())

    const result = await driveHandler(postHandler, {
      payload: { action: 'search', search: 'dupont' }
    })

    expect(result.view.context.transporterRows.map((row) => row.id)).toEqual([
      kept.id
    ])
  })

  it('Should refuse a pick of a transporter another organisation added', async () => {
    const kept = rememberTransporter(ANOTHER_ORG, haulier())

    const result = await driveHandler(postHandler, {
      payload: { action: 'save', transporter: kept.id }
    })

    expect(result.view.context.errors.transporter).toBeTruthy()
    expect(result.after.transporterType).toBeUndefined()
    expect(rowFor(result.view.context, kept.id)).toBeUndefined()
  })

  it('Should keep another organisation’s transporter off the list entirely', async () => {
    const kept = rememberTransporter(ANOTHER_ORG, haulier())

    const result = await driveHandler(getHandler)

    expect(rowFor(result.view.context, kept.id)).toBeUndefined()
    expect(
      result.view.context.transporterRows.some(
        (row) => row.name === HAULIER_NAME
      )
    ).toBe(false)
    expect(result.view.context.transporterRows).toHaveLength(parties().length)
  })

  it('Should re-check it on an earlier notification after a later one corrected its spelling', async () => {
    const kept = rememberTransporter(ORG, haulier())
    rememberTransporter(ORG, { ...haulier(), name: HAULIER_NAME.toUpperCase() })

    const result = await driveHandler(getHandler, {
      seed: {
        transporterType: PRIVATE,
        privateTransporter: { name: HAULIER_NAME }
      }
    })

    expect(rowFor(result.view.context, kept.id).checked).toBe(true)
  })
})
