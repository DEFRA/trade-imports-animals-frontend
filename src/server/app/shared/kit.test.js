import { beforeAll, describe, expect, it } from 'vitest'

import { AMEND, DRAFT, makeScope } from '../engine/index.js'
import { SET_ID } from '../sets/live-animals/set.js'
import { dispatchPages } from '../sets/live-animals/journeys/linear/features/index.js'
import { buildDispatch } from '../flow/dispatch.js'
import { pagePath } from './paths.js'
import {
  expectOneLogged,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  journeyRequest,
  recordingLogger,
  unavailableBackendError
} from '../engine/test-support.js'
import {
  base,
  dateField,
  hubExitTarget,
  logRefusal,
  nextTarget,
  pageRoutes,
  REFUSAL_LOG_MESSAGE,
  recoverableSave,
  requestSaveChoice,
  returnedSaveChoice,
  setlessBase,
  withTrail
} from './kit.js'

describe('#requestSaveChoice — what a request says about how it was saved', () => {
  const params = { journeyId: 'journey-1' }

  it('Should be the hub exit only for the named hub exit', () => {
    expect(
      requestSaveChoice({ payload: { exit: 'hub' }, params, query: {} })
    ).toEqual({ hubExit: true })
    expect(requestSaveChoice({ params, query: {} }).hubExit).toBe(false)
    expect(
      requestSaveChoice({ payload: { exit: 'other' }, params, query: {} })
        .hubExit
    ).toBe(false)
  })

  it('Should carry nothing from the trail of the query', () => {
    expect(requestSaveChoice({ params, query: { from: 'overview' } })).toEqual({
      hubExit: false
    })
  })
})

describe('#returnedSaveChoice — a save choice made on the form the upload service returns', () => {
  it('Should be the hub exit only for the named hub exit', () => {
    expect(returnedSaveChoice({ exit: 'hub' })).toEqual({ hubExit: true })
    expect(returnedSaveChoice({ action: 'continue' })).toEqual({
      hubExit: false
    })
  })
})

describe('#hubExitTarget given a save choice', () => {
  const request = {
    params: { journeyId: 'journey-1' },
    payload: { exit: 'hub' }
  }

  it('Should follow the given save choice, not the request payload', () => {
    expect(
      hubExitTarget(request, { saveChoice: { hubExit: false } })
    ).toBeNull()
  })

  it('Should read the request when no save choice is given', () => {
    expect(hubExitTarget(request)).toMatch(/journey-1$/)
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

describe('#base — journey strip', () => {
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
      url: new URL(
        'http://localhost/notifications/journey-1/origin?from=notification-view'
      )
    }
    const h = { redirect: (to) => ({ redirect: to }) }

    const response = await postRoute.handler(request, h)

    expect(response).toEqual({
      redirect:
        '/notifications/journey-1/origin?from=notification-view&staleAction=1'
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

describe('#nextTarget — Save and continue when a required earlier answer is missing', () => {
  const IMPORT_REASON = 'import-reason'
  const importReasonPage = { id: IMPORT_REASON, slug: IMPORT_REASON }
  const PORT_OF_ENTRY = 'port-of-entry'

  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  it('Should land on What are you importing? with the page saved on the trail, logging the unopened page', () => {
    const request = journeyRequest('j-1', {
      route: { path: `/notifications/{journeyId}/${PORT_OF_ENTRY}` }
    })

    const target = nextTarget(
      request,
      { id: PORT_OF_ENTRY, slug: PORT_OF_ENTRY },
      makeScope({ countryOfOrigin: 'FR', meansOfTransport: 'ROAD_VEHICLE' })
    )

    expect(target).toBe(
      withTrail(pagePath('j-1', 'commodities'), [PORT_OF_ENTRY])
    )
    expectOneLogged(request.logger, {
      level: 'info',
      fields: {
        journeyId: 'j-1',
        route: `/notifications/{journeyId}/${PORT_OF_ENTRY}`,
        savedPageId: PORT_OF_ENTRY,
        unopenedPageId: 'transit-countries',
        missingAnswerIds: ['commodityCode']
      },
      message:
        'Save and continue opened the page that asks for a missing earlier answer'
    })
  })

  it('Should land on What are you importing? from the main import reason with only the country of origin saved', () => {
    const request = journeyRequest('j-1')

    expect(
      nextTarget(
        request,
        importReasonPage,
        makeScope({ countryOfOrigin: 'FR' })
      )
    ).toBe(withTrail(pagePath('j-1', 'commodities'), [IMPORT_REASON]))
  })

  it('Should log nothing when the next page that applies is offered', () => {
    const request = journeyRequest('j-1')

    nextTarget(
      request,
      { id: 'origin', slug: 'origin' },
      makeScope({ countryOfOrigin: 'FR' })
    )

    expect(request.logger.entries).toEqual([])
  })
})
