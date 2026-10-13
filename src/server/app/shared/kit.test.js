import { describe, expect, it } from 'vitest'

import { AMEND, DRAFT, SUBMITTED } from '../engine/index.js'
import {
  amendReviewTarget,
  base,
  dateField,
  exitTarget,
  isHubExit,
  skipsRequiredChecks
} from './kit.js'
import { withSavedTemplateChange, withTemplateMode } from './template-mode.js'

const OWNER = '2100010101'
const JOURNEY_ID = 'journey-1'

const changeRequest = {
  payload: {},
  params: { journeyId: JOURNEY_ID },
  query: { change: '1' }
}

describe('#exitTarget — where a change-context save returns', () => {
  it('Should return to the review outside template mode', () => {
    expect(exitTarget(changeRequest, '/next')).toMatch(
      new RegExp(`/notifications/${JOURNEY_ID}/notification-view$`)
    )
  })

  it('Should return to the template review from a template being created', () => {
    withTemplateMode(OWNER, () => {
      expect(exitTarget(changeRequest, '/next')).toMatch(
        new RegExp(`/templates/${JOURNEY_ID}/notification-view$`)
      )
    })
  })

  it('Should return to the template page from a saved template', () => {
    withTemplateMode(OWNER, () =>
      withSavedTemplateChange(() => {
        expect(exitTarget(changeRequest, '/next')).toMatch(
          new RegExp(`/templates/${JOURNEY_ID}$`)
        )
      })
    )
  })

  it('Should leave a page with no change marker on its fallback', () => {
    withTemplateMode(OWNER, () =>
      withSavedTemplateChange(() => {
        expect(exitTarget({ ...changeRequest, query: {} }, '/next')).toBe(
          '/next'
        )
      })
    )
  })
})

describe('#base — the page ending', () => {
  it('Should flag a page changing a saved template, and no other', () => {
    expect(base('Title', { journeyId: JOURNEY_ID }).templateChange).toBe(false)
    withTemplateMode(OWNER, () => {
      expect(base('Title', { journeyId: JOURNEY_ID }).templateChange).toBe(
        false
      )
      withSavedTemplateChange(() => {
        expect(base('Title', { journeyId: JOURNEY_ID }).templateChange).toBe(
          true
        )
      })
    })
  })
})

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
  it('Should carry supplied bounds through verbatim so the macro emits the restriction attributes', () => {
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

  it('Should leave both bounds undefined when none are supplied, so an unrestricted picker stays unrestricted', () => {
    const field = dateField('exitDate', { label: 'Exit date' })

    expect(field.minDate).toBeUndefined()
    expect(field.maxDate).toBeUndefined()
  })

  it('Should carry form-group classes through, so a stylesheet can reach one picker rather than all of them', () => {
    const field = dateField('arrivalDateAtPort', {
      label: 'Arrival date at port of entry',
      formGroupClasses: 'app-date-picker'
    })

    expect(field.formGroup).toEqual({ classes: 'app-date-picker' })
  })

  it('Should leave the form group undefined when no classes are supplied, so the macro emits the default markup', () => {
    const field = dateField('exitDate', { label: 'Exit date' })

    expect(field.formGroup).toBeUndefined()
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

describe('#skipsRequiredChecks — the saves that do not demand every answer', () => {
  const params = { journeyId: 'journey-1' }

  it('Should be true for Save and return to overview', () => {
    expect(
      skipsRequiredChecks(
        { params, payload: { exit: 'hub' }, query: {} },
        { status: DRAFT }
      )
    ).toBe(true)
  })

  it('Should be true for a Change-link save while amending', () => {
    expect(
      skipsRequiredChecks({ params, query: { change: '1' } }, { status: AMEND })
    ).toBe(true)
  })

  it('Should be false for a Change-link save of a draft', () => {
    expect(
      skipsRequiredChecks({ params, query: { change: '1' } }, { status: DRAFT })
    ).toBe(false)
  })

  it('Should be false with neither', () => {
    expect(skipsRequiredChecks({ params, query: {} }, { status: AMEND })).toBe(
      false
    )
  })
})
