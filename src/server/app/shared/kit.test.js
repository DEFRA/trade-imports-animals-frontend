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
  appendChangeContext,
  base,
  dateField,
  exitTarget,
  logRefusal,
  pageRoutes,
  REFUSAL_LOG_MESSAGE,
  readReturnMarker,
  recoverableSave,
  requestSaveChoice,
  returnedSaveChoice,
  setlessBase,
  withReturnMarker
} from './kit.js'
import { AMEND_RETURN_CHOICE } from './amend-form-actions.js'

describe('#requestSaveChoice — what a request says about how it was saved', () => {
  const params = { journeyId: 'journey-1' }

  it('Should be the hub exit only for the named hub exit', () => {
    expect(
      requestSaveChoice({ payload: { exit: 'hub' }, params, query: {} })
    ).toEqual({ hubExit: true, change: false })
    expect(requestSaveChoice({ params, query: {} }).hubExit).toBe(false)
    expect(
      requestSaveChoice({ payload: { exit: 'other' }, params, query: {} })
        .hubExit
    ).toBe(false)
  })

  it('Should carry the change context of the query', () => {
    expect(requestSaveChoice({ params, query: { change: '1' } }).change).toBe(
      true
    )
  })
})

describe('#returnedSaveChoice — a save choice made on the form the upload service returns', () => {
  const params = { journeyId: 'journey-1' }
  const openedWithChange = { params, query: { change: '1' } }
  const openedWithoutChange = { params, query: {} }
  const reviewPath = /journey-1\/notification-view$/
  const fallback = '/next'

  const exitFor = (request, returnedForm, journey) =>
    exitTarget(request, fallback, {
      saveChoice: returnedSaveChoice(request, returnedForm, journey)
    })

  it('Should go on, not to the review, for the amend Save and continue from a page opened with change context', () => {
    expect(
      exitFor(openedWithChange, { action: 'continue' }, { status: AMEND })
    ).toBe(fallback)
  })

  it('Should go to the review for the amend Save and return from a page opened without change context', () => {
    expect(
      exitFor(
        openedWithoutChange,
        { [AMEND_RETURN_CHOICE.name]: AMEND_RETURN_CHOICE.value },
        { status: AMEND }
      )
    ).toMatch(reviewPath)
  })

  it('Should go on, not to the review, for the amend Save and return choice on a journey that is not being amended', () => {
    expect(
      exitFor(
        openedWithoutChange,
        { [AMEND_RETURN_CHOICE.name]: AMEND_RETURN_CHOICE.value },
        { status: DRAFT }
      )
    ).toBe(fallback)
  })

  it('Should go on, not to the review, for the amend Save and return choice when no journey is given', () => {
    expect(
      exitFor(openedWithoutChange, {
        [AMEND_RETURN_CHOICE.name]: AMEND_RETURN_CHOICE.value
      })
    ).toBe(fallback)
  })

  it('Should go to the review for a form saved from a page opened with change context when the journey is not being amended', () => {
    expect(
      exitFor(openedWithChange, { action: 'continue' }, { status: DRAFT })
    ).toMatch(reviewPath)
  })

  it('Should go to the overview for the hub exit, whatever the change context', () => {
    expect(
      exitFor(openedWithChange, { exit: 'hub' }, { status: AMEND })
    ).toMatch(/journey-1$/)
    expect(
      exitFor(openedWithChange, { exit: 'hub' }, { status: DRAFT })
    ).toMatch(/journey-1$/)
  })
})

describe('#exitTarget given a save choice', () => {
  const request = {
    params: { journeyId: 'journey-1' },
    payload: { exit: 'hub' },
    query: { change: '1' }
  }
  const plainSave = { hubExit: false, change: false }

  it('Should follow the given save choice, not the request payload and query', () => {
    expect(exitTarget(request, '/next', { saveChoice: plainSave })).toBe(
      '/next'
    )
  })

  it('Should read the request when no save choice is given', () => {
    expect(exitTarget(request, '/next')).toMatch(/journey-1$/)
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

  it('Should leave the status strip off when showJourneyStrip is false and still carry the journey concurrency token', () => {
    const view = base('t', {
      journey: { journeyId: 'j', status: DRAFT, concurrencyToken: 7 },
      showJourneyStrip: false
    })

    expect(view.journeyStrip).toBeNull()
    expect(view.concurrencyToken).toBe(7)
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
      continueAction: `${ORIGIN_PATH}?return=addresses`,
      returnChoice: AMEND_RETURN_CHOICE
    })
  })

  it('Should give no amend form actions outside an amendment or without the request', () => {
    expect(
      base('t', { journey: { status: DRAFT }, request: originRequest }).amend
    ).toBeNull()
    expect(base('t', { journey: { status: AMEND } }).amend).toBeNull()
  })
})

describe('#base — success banner', () => {
  it('Should carry the success banner it is given', () => {
    const banner = { titleText: 'Success', text: 'Saved' }

    expect(base('t', { successBanner: banner }).successBanner).toEqual(banner)
  })

  it('Should carry no success banner by default, with or without a journey', () => {
    expect(
      base('t', { journey: { journeyId: 'j', status: DRAFT } }).successBanner
    ).toBeNull()
    expect(base('t').successBanner).toBeNull()
    expect(setlessBase('t').successBanner).toBeNull()
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

  it('Should log at warn when the caller sets the level', () => {
    const request = journeyRequest('journey-1')

    logRefusal(request, { level: 'warn', reason: 'unlisted-species' })

    expectOneRefusalLogged(request.logger, {
      journeyId: 'journey-1',
      errorCodes: [],
      level: 'warn',
      reason: 'unlisted-species'
    })
  })
})

describe('#appendChangeContext — the change marker on an href', () => {
  it('Should start the query string on an href without one', () => {
    expect(appendChangeContext('/a')).toBe('/a?change=1')
  })

  it('Should join to the query string an href already has', () => {
    expect(appendChangeContext('/a?x=1')).toBe('/a?x=1&change=1')
  })
})

describe('#withReturnMarker — the return marker on an href', () => {
  it('Should start the query string on an href without one', () => {
    expect(withReturnMarker('/a', 'addresses')).toBe('/a?return=addresses')
  })

  it('Should join to the query string an href already has', () => {
    expect(withReturnMarker('/a?x=1', 'addresses')).toBe(
      '/a?x=1&return=addresses'
    )
  })

  it('Should encode a slug that contains a slash', () => {
    expect(withReturnMarker('/a', 'commodities/identification')).toBe(
      '/a?return=commodities%2Fidentification'
    )
  })
})

describe('#readReturnMarker — the page a request says it came from', () => {
  const allowedSlugs = ['addresses', 'notification-view']

  it('Should be empty when the request carries no marker', () => {
    expect(readReturnMarker({ query: {} }, allowedSlugs)).toEqual({})
  })

  it('Should honour a marker naming an allowed slug', () => {
    expect(
      readReturnMarker({ query: { return: 'addresses' } }, allowedSlugs)
    ).toEqual({ honouredSlug: 'addresses' })
  })

  it('Should refuse a marker naming anything else, holding the value received', () => {
    expect(
      readReturnMarker({ query: { return: '//evil.example' } }, allowedSlugs)
    ).toEqual({ refusedMarker: '//evil.example' })
  })
})
