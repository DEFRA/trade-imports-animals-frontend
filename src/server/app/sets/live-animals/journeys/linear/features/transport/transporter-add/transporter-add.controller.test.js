import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import {
  COMMERCIAL,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { dispatchPages } from '../../index.js'
import { expectRecoverableSaveFailureKeepingValues } from '../test-support.js'

import * as transporterAdd from './transporter-add.controller.js'

const LIST_SLUG = 'transporters'
const COMMERCIAL_SLUG = 'transporters/add/commercial'
const PRIVATE_SLUG = 'transporters/add/private'

const handlerFor = (method) =>
  transporterAdd.routes.find((route) => route.method === method).handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

describe('/transporters/add', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should point Back at the transporter list', async () => {
    const result = await driveHandler(getHandler)

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, LIST_SLUG)
    )
  })

  it('Should keep the change context on Back when the trader is changing an answer', async () => {
    const result = await driveHandler(getHandler, { query: { change: '1' } })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, LIST_SLUG)}?change=1`
    )
  })

  it('Should leave the type unanswered before one is chosen', async () => {
    const result = await driveHandler(getHandler)

    expect(result.view.context.values.transporterType).toBe('')
  })

  it('Should show the type already on the notification', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: COMMERCIAL }
    })

    expect(result.view.context.values.transporterType).toBe(COMMERCIAL)
  })

  it('Should send a commercial transporter to the details form', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: COMMERCIAL }
    })

    expect(result.after.transporterType).toBe(COMMERCIAL)
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, COMMERCIAL_SLUG)
    })
  })

  it('Should send a private transporter to the details form', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: PRIVATE }
    })

    expect(result.after.transporterType).toBe(PRIVATE)
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, PRIVATE_SLUG)
    })
  })

  it('Should send an unanswered question back to the list', async () => {
    const result = await driveHandler(postHandler, { payload: {} })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, LIST_SLUG)
    })
  })

  it('Should keep the change context on the onward redirect', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: COMMERCIAL },
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, COMMERCIAL_SLUG)}?change=1`
    })
  })

  it('Should reject a transporter type the journey does not offer', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: 'Municipal' }
    })

    expect(result.view.context.errors.transporterType).toBeTruthy()
    expect(result.view.context.errorSummary.errorList).toHaveLength(1)
    expect(result.after.transporterType).toBeUndefined()
  })

  it('Should re-render the question at 500 with the answer kept after a recoverable save failure', async () => {
    const { response } = await driveHandler(postHandler, {
      payload: { transporterType: COMMERCIAL },
      saveFailure: unavailableBackendError('save the transporter type')
    })

    expectRecoverableSaveFailureKeepingValues(response, {
      transporterType: COMMERCIAL
    })
  })
})
