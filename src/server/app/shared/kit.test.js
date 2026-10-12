import { describe, expect, it } from 'vitest'

import { base, dateField, exitTarget } from './kit.js'
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
})
