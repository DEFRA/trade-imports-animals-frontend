import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  reviewChangeLinkQuery,
  expectNoRefusalLogged,
  expectOneRefusalLogged,
  useStubbedJourney,
  withFlowOnlyAnswers
} from '../../../../../../../engine/test-support.js'
import { flowOnlyAnswersCookie } from '../../../../../../../engine/persistence/session.js'
import {
  TRANSPORTER_TYPE_CHOSEN,
  TRANSPORTER_TYPE_RESTART
} from '../transporter-add-session.js'
import {
  COMMERCIAL,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { CYA_SLUG, withTrail } from '../../../../../../../shared/kit.js'
import { dispatchPages } from '../../index.js'
import { itCarriesTheTrailOnBack } from '../test-support.js'
import { copy } from '../copy/copy.en.js'

import * as transporterAdd from './transporter-add.controller.js'

const LIST_SLUG = 'transporters'
const COMMERCIAL_SLUG = 'transporters/add/commercial'
const PRIVATE_SLUG = 'transporters/add/private'

const handlerFor = (method) =>
  transporterAdd.routes.find((route) => route.method === method).handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

const chosenTypeOf = (result) =>
  result.cookies[flowOnlyAnswersCookie()]?.[result.journeyId]?.[
    TRANSPORTER_TYPE_CHOSEN
  ]

describe('/transporters/add', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should point Back at the transporter list', async () => {
    const result = await driveHandler(getHandler)

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, LIST_SLUG)
    )
  })

  itCarriesTheTrailOnBack(getHandler, { backSlug: LIST_SLUG })

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

  it('Should render blank and clear the flag when the list has flagged a restart, leaving the stored type itself untouched', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: PRIVATE },
      startingFrom: [withFlowOnlyAnswers({ [TRANSPORTER_TYPE_RESTART]: true })]
    })

    expect(result.view.context.values.transporterType).toBe('')
    expect(result.after.transporterType).toBe(PRIVATE)
    expect(
      result.cookies[flowOnlyAnswersCookie()][result.journeyId][
        TRANSPORTER_TYPE_RESTART
      ]
    ).toBeNull()
  })

  it('Should hold a commercial choice as flow-only state, leaving the stored type untouched, and send the trader to its details form', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: COMMERCIAL }
    })

    expect(result.after.transporterType).toBeUndefined()
    expect(chosenTypeOf(result)).toBe(COMMERCIAL)
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, COMMERCIAL_SLUG)
    })
  })

  it('Should hold a private choice as flow-only state, leaving the stored type untouched, and send the trader to its details form', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: PRIVATE }
    })

    expect(result.after.transporterType).toBeUndefined()
    expect(chosenTypeOf(result)).toBe(PRIVATE)
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, PRIVATE_SLUG)
    })
  })

  it('Should keep the trader on the page with an error when nothing is chosen, leaving the stored type unchanged', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: {}
    })

    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors.transporterType).toBe(
      copy.transporterAdd.errors.transporterTypeRequired
    )
    expect(result.view.context.errorSummary.errorList).toHaveLength(1)
    expect(result.after.transporterType).toBe(PRIVATE)
    expectNoRefusalLogged(result.logger)
  })

  it("Should treat a whitespace-only type as the trader's own blank answer, leaving the stored type unchanged and logging nothing", async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: PRIVATE },
      payload: { transporterType: '   ' }
    })

    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors.transporterType).toBe(
      copy.transporterAdd.errors.transporterTypeRequired
    )
    expect(result.after.transporterType).toBe(PRIVATE)
    expectNoRefusalLogged(result.logger)
  })

  it('Should hold an offered type posted with surrounding whitespace trimmed, and reach that type’s own add form', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: '  Commercial  ' }
    })

    expect(chosenTypeOf(result)).toBe(COMMERCIAL)
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, COMMERCIAL_SLUG)
    })
  })

  it('Should carry the trail on the onward redirect', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: COMMERCIAL },
      startingFrom: [{ query: reviewChangeLinkQuery() }]
    })

    expect(result.response).toEqual({
      redirect: withTrail(pagePath(result.journeyId, COMMERCIAL_SLUG), [
        CYA_SLUG
      ])
    })
  })

  it('Should reject a transporter type the journey does not offer, with the feature’s own message, and log exactly one refusal', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: 'Municipal' }
    })

    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors.transporterType).toBe(
      copy.transporterAdd.errors.transporterTypeRequired
    )
    expect(result.view.context.errorSummary.errorList).toHaveLength(1)
    expect(result.after.transporterType).toBeUndefined()
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['transporterType'],
      transporterType: 'Municipal'
    })
  })
})
