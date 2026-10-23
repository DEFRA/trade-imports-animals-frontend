import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectNoRefusalLogged,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { expectRecoverableSaveFailureKeepingValues } from '../test-support.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import { pagePath } from '../../../../../../../shared/paths.js'

import * as transportersSelect from './transporters-select.controller.js'

const ADD_SLUG = 'transporters/add'
const GARCIA_ID = 'garcia-livestock-transport'

const handlerFor = (method) =>
  transportersSelect.routes.find((route) => route.method === method).handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

describe('/transporters/select', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should point Back at the add route', async () => {
    const result = await driveHandler(getHandler)

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, ADD_SLUG)
    )
  })

  it('Should keep the change context on Back when the trader is changing an answer', async () => {
    const result = await driveHandler(getHandler, { query: { change: '1' } })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, ADD_SLUG)}?change=1`
    )
  })

  it('Should hand a save while changing back to the summary', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: 'Commercial' },
      payload: { commercialTransporter: GARCIA_ID },
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'notification-view')
    })
  })

  it('Should reject a transporter that is not on the register', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: 'Commercial' },
      payload: { commercialTransporter: 'not-a-transporter' }
    })

    expect(result.view.context.errors.commercialTransporter).toBeTruthy()
    expect(result.view.context.errorSummary.errorList).toHaveLength(1)
    expect(result.after.commercialTransporter).toBeUndefined()
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectNoRefusalLogged(result.logger)
  })

  it('Should walk on without saving when no transporter is picked', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: 'Commercial' },
      payload: {}
    })

    expect(result.after.commercialTransporter).toBeUndefined()
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should re-render the register at 500 with the pick kept after a recoverable save failure', async () => {
    const { response } = await driveHandler(postHandler, {
      seed: { transporterType: 'Commercial' },
      payload: { commercialTransporter: GARCIA_ID },
      saveFailure: unavailableBackendError('save the transporter')
    })

    expectRecoverableSaveFailureKeepingValues(response, [GARCIA_ID], {
      keptIn: (context) =>
        context.transporterOptions
          .filter((option) => option.checked)
          .map((option) => option.value)
    })
  })
})
