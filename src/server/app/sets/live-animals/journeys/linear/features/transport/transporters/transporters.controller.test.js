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
import {
  COMMERCIAL,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import { dispatchPages } from '../../index.js'

import * as transporters from './transporters.controller.js'

const GARCIA_ID = 'garcia-livestock-transport'
const GARCIA_NAME = 'García Livestock Transport SL'
const ABERDEEN_ID = 'aberdeen-livestock'
const ABERDEEN_NAME = 'Aberdeen Livestock Ltd'
// The one record design release 1 shows as added but not yet approved.
const ROMANIAN_ID = 'romanian-agri-exports'

const handlerFor = (method) =>
  transporters.routes.find((route) => route.method === method).handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

const rowFor = (context, id) =>
  context.transporterRows.find((row) => row.id === id)

/** Drive a POST whose save fails the way a backend outage fails it: recoverably,
 * so the page comes back with the banner rather than throwing. */
const driveSaveFailure = async (payload) => {
  const journey = await store.create()
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

// The list is the journey's one transporter step: both kinds of transporter sit
// on it, and the pick settles the type as well as the record.
describe('/transporters', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

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

  // Design release 1 gives every transporter its own column of facts rather
  // than one run-on hint, so the address stands on its own and a private
  // transporter's blank approval number leaves an empty cell.
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

  // The error summary links to the field's own id, so the first radio has to
  // carry it and the rest have to differ.
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
      payload: { transporter: 'not-a-transporter' }
    })

    expect(result.view.context.errors.transporter).toBeTruthy()
    expect(result.view.context.errorSummary.errorList).toHaveLength(1)
    expect(result.after.transporterType).toBeUndefined()
  })

  it('Should save the type off the record when a commercial transporter is picked', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporter: GARCIA_ID }
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
      payload: { transporter: ABERDEEN_ID }
    })

    expect(result.after.transporterType).toBe(PRIVATE)
    expect(result.after.privateTransporter.name).toBe(ABERDEEN_NAME)
    expect(result.response.redirect).toBeTruthy()
  })

  // The page saves through unfilled, the way it did as a journey step: a trader
  // who has not chosen yet still walks on.
  it('Should walk on without saving when no transporter is picked', async () => {
    const result = await driveHandler(postHandler, { payload: {} })

    expect(result.after.transporterType).toBeUndefined()
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should re-render the list at 500 with the pick kept after a recoverable save failure', async () => {
    const response = await driveSaveFailure({ transporter: GARCIA_ID })

    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.context.recoverableError).toBe(true)
    expect(rowFor(response.context, GARCIA_ID).checked).toBe(true)
  })
})
