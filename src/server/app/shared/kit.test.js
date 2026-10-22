import { describe, expect, it } from 'vitest'

import { AMEND, DRAFT, SUBMITTED } from '../engine/index.js'
import {
  expectOneLogged,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  journeyRequest,
  recordingLogger,
  unavailableBackendError
} from '../engine/test-support.js'
import {
  amendReviewTarget,
  base,
  dateField,
  isHubExit,
  logRefusal,
  pageRoutes,
  REFUSAL_LOG_MESSAGE,
  recoverableSave
} from './kit.js'

describe('#isHubExit — the Save and return to overview submit', () => {
  const params = { journeyId: 'journey-1' }

  it('Should be true only for the named hub exit', () => {
    expect(isHubExit({ payload: { exit: 'hub' }, params })).toBe(true)
  })

  it('Should be false with no payload, no exit or another exit', () => {
    expect(isHubExit({ params })).toBe(false)
    expect(isHubExit({ payload: {}, params })).toBe(false)
    expect(isHubExit({ payload: { exit: 'other' }, params })).toBe(false)
  })
})

describe('#dateField — MoJ date-picker view model', () => {
  it('Should carry supplied bounds and value as d/m/yyyy text', () => {
    const field = dateField('arrivalDateAtPort', {
      label: 'Arrival date at port of entry',
      value: { day: '3', month: '1', year: '2027' },
      minDate: '5/8/2026',
      maxDate: '12/2/2027'
    })

    expect(field.minDate).toBe('5/8/2026')
    expect(field.maxDate).toBe('12/2/2027')
    expect(field.value).toBe('3/1/2027')
  })

  it('Should leave both bounds undefined when none are supplied', () => {
    const field = dateField('exitDate', { label: 'Exit date' })

    expect(field.minDate).toBeUndefined()
    expect(field.maxDate).toBeUndefined()
  })

  it('Should give the form group exactly the house date-picker class when the page passes no classes', () => {
    const field = dateField('exitDate', { label: 'Exit date' })

    expect(field.formGroup).toEqual({ classes: 'app-date-picker' })
  })

  it('Should follow the house date-picker class with the classes the page passes', () => {
    const field = dateField('exitDate', {
      label: 'Exit date',
      formGroupClasses: 'govuk-!-margin-bottom-6'
    })

    expect(field.formGroup).toEqual({
      classes: 'app-date-picker govuk-!-margin-bottom-6'
    })
  })

  it('Should set the label in the size the page asks for, and small when it asks for none', () => {
    const medium = dateField('entryDate', {
      label: 'Entry date',
      labelClasses: 'govuk-label--m'
    })
    const unasked = dateField('otherDate', { label: 'Other date' })

    expect(medium.label.classes).toBe('govuk-label--m')
    expect(unasked.label.classes).toBe('govuk-label--s')
  })
})

describe('#base — amending', () => {
  it('Should be true only for a journey being amended', () => {
    expect(base('title', { journey: { status: AMEND } }).amending).toBe(true)
    expect(base('title', { journey: { status: DRAFT } }).amending).toBe(false)
    expect(base('title', { journey: { status: SUBMITTED } }).amending).toBe(
      false
    )
    expect(base('title').amending).toBe(false)
  })

  it('Should offer Cancel amend in the strip only for a journey being amended', () => {
    const amending = { journeyId: 'j', status: AMEND }
    expect(base('t', { journey: amending }).journeyStrip.cancelAmend).toEqual({
      href: expect.stringMatching(/\/j\/cancel-amend$/),
      text: 'Cancel amend'
    })
    expect(
      base('t', { journey: { journeyId: 'j', status: DRAFT } }).journeyStrip
        .cancelAmend
    ).toBeUndefined()
  })

  it('Should withhold Cancel amend when the page opts out', () => {
    expect(
      base('t', {
        journey: { journeyId: 'j', status: AMEND },
        offerCancelAmend: false
      }).journeyStrip.cancelAmend
    ).toBeUndefined()
  })

  const ORIGIN_PATH = '/n/j-1/origin'
  const originRequest = {
    path: ORIGIN_PATH,
    url: new URL(`http://x${ORIGIN_PATH}?change=1&return=addresses`)
  }

  it("Should give an amended journey's page the two save-button form actions, keeping its own query", () => {
    expect(
      base('t', { journey: { status: AMEND }, request: originRequest }).amend
    ).toEqual({
      returnAction: `${ORIGIN_PATH}?change=1&return=addresses`,
      continueAction: `${ORIGIN_PATH}?return=addresses`
    })
  })

  it('Should give no amend form actions outside an amendment or without the request', () => {
    expect(
      base('t', { journey: { status: DRAFT }, request: originRequest }).amend
    ).toBeNull()
    expect(base('t', { journey: { status: AMEND } }).amend).toBeNull()
  })
})

describe('#amendReviewTarget — where a Change-link save of an amendment goes', () => {
  const params = { journeyId: 'journey-1' }
  const fromChangeLink = { params, query: { change: '1' } }
  const notFromChangeLink = { params, query: {} }

  it('Should be the review for an amendment saved from a Change link', () => {
    expect(amendReviewTarget(fromChangeLink, { status: AMEND })).toMatch(
      /journey-1\/notification-view$/
    )
  })

  it('Should be null for a draft saved from a Change link', () => {
    expect(amendReviewTarget(fromChangeLink, { status: DRAFT })).toBeNull()
  })

  it('Should be null for an amendment saved without a Change link', () => {
    expect(amendReviewTarget(notFromChangeLink, { status: AMEND })).toBeNull()
  })
})

describe('#pageRoutes — a save refused as stale', () => {
  const staleSave = () => {
    const error = new Error('stale')
    error.code = 'STALE_CONCURRENCY_TOKEN'
    throw error
  }
  const postRoute = pageRoutes(
    { slug: 'origin' },
    { get: () => null, post: staleSave }
  ).find((route) => route.method === 'POST')

  it('Should log the journey id and posted token, then redirect back to the page with staleAction', async () => {
    const logger = recordingLogger()
    const request = {
      logger,
      params: { journeyId: 'journey-1' },
      payload: { concurrencyToken: '3' },
      path: '/notifications/journey-1/origin',
      url: new URL('http://localhost/notifications/journey-1/origin?change=1')
    }
    const h = { redirect: (to) => ({ redirect: to }) }

    const response = await postRoute.handler(request, h)

    expect(response).toEqual({
      redirect: '/notifications/journey-1/origin?change=1&staleAction=1'
    })
    expect(logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: 'journey-1', postedConcurrencyToken: '3' },
        message:
          'Save refused: the notification changed since the page was shown'
      }
    ])
  })
})

describe('#recoverableSave', () => {
  const fallbackResponse = { fallback: true }
  const fallback = () => fallbackResponse

  it('Should return the value of a save that succeeds and log nothing', async () => {
    const request = journeyRequest('journey-1')

    const outcome = await recoverableSave(
      request,
      async () => 'saved',
      fallback
    )

    expect(outcome).toEqual({ value: 'saved' })
    expect(request.logger.entries).toEqual([])
  })

  it('Should log one warning with the journey id and the error, then answer with the fallback, when the backend is unavailable', async () => {
    const request = journeyRequest('journey-1')
    const failure = unavailableBackendError('save answers')

    const outcome = await recoverableSave(
      request,
      async () => {
        throw failure
      },
      fallback
    )

    expect(outcome).toEqual({ failure: fallbackResponse })
    expectOneSaveFallbackLogged(request.logger, {
      journeyId: 'journey-1',
      err: failure
    })
  })

  it('Should log the ids the page passes beside the journey id', async () => {
    const request = journeyRequest('journey-1')
    const failure = unavailableBackendError('save answers')

    await recoverableSave(
      request,
      async () => {
        throw failure
      },
      fallback,
      { uploadId: 'up-1' }
    )

    expectOneSaveFallbackLogged(request.logger, {
      journeyId: 'journey-1',
      uploadId: 'up-1',
      err: failure
    })
  })

  it('Should rethrow a stale concurrency token without logging it', async () => {
    const request = journeyRequest('journey-1')
    const stale = Object.assign(new Error('stale'), {
      code: 'STALE_CONCURRENCY_TOKEN'
    })

    await expect(
      recoverableSave(
        request,
        async () => {
          throw stale
        },
        fallback
      )
    ).rejects.toBe(stale)
    expect(request.logger.entries).toEqual([])
  })

  it('Should rethrow an error that is not a recoverable backend failure without logging it', async () => {
    const request = journeyRequest('journey-1')
    const bug = new Error('bug')

    await expect(
      recoverableSave(
        request,
        async () => {
          throw bug
        },
        fallback
      )
    ).rejects.toBe(bug)
    expect(request.logger.entries).toEqual([])
  })
})

describe('#logRefusal', () => {
  it('Should log one line with the journey id and the field keys, never the messages', () => {
    const request = journeyRequest('journey-1')

    logRefusal(request, {
      fieldErrors: {
        postcode: 'Enter a postcode',
        email: 'Enter an email address'
      }
    })

    expectOneLogged(request.logger, {
      level: 'info',
      fields: { journeyId: 'journey-1', errorCodes: ['postcode', 'email'] },
      message: REFUSAL_LOG_MESSAGE
    })
  })

  it('Should carry the named reason and ids the refusal turned on', () => {
    const request = journeyRequest('journey-1')

    logRefusal(request, {
      fieldErrors: { file: 'Too big' },
      reason: 'too-big',
      size: 3
    })

    expectOneRefusalLogged(request.logger, {
      journeyId: 'journey-1',
      errorCodes: ['file'],
      reason: 'too-big',
      size: 3
    })
  })

  it('Should log no error codes and the named reason when the page shows no errors', () => {
    const request = journeyRequest('journey-1')

    logRefusal(request, { reason: 'no-line' })

    expectOneRefusalLogged(request.logger, {
      journeyId: 'journey-1',
      errorCodes: [],
      reason: 'no-line'
    })
  })
})
