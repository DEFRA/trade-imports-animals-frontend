import { describe, expect, it } from 'vitest'
import {
  errorSummaryLinks,
  errorWiring,
  extractInputs
} from './extract-inputs.js'

/**
 * Pins the extractor on hand-written govuk-frontend v6-shaped fragments
 * — the walker's guard is itself new code (TEST-2/7), so its folding
 * rules are proven here before the walker leans on them.
 */

const TEXT_INPUT =
  '<input class="govuk-input" id="fullName" name="fullName" type="text">'
const EMAIL_INPUT =
  '<input class="govuk-input" id="email" name="email" type="email" spellcheck="false">'
const CRUMB = '<input type="hidden" name="crumb" value="token">'
const FILE_INPUT =
  '<input class="govuk-file-upload" id="vehiclePhoto" name="vehiclePhoto" type="file">'
const TEXTAREA =
  '<textarea class="govuk-textarea" id="modDescription" name="modDescription" rows="5"></textarea>'

const RADIO_GROUP = `
  <input class="govuk-radios__input" id="voluntaryExcess" name="voluntaryExcess" type="radio" value="yes">
  <div class="govuk-radios__conditional">
    <input class="govuk-input" id="excessAmount" name="excessAmount" type="text">
  </div>
  <input class="govuk-radios__input" id="voluntaryExcess-2" name="voluntaryExcess" type="radio" value="no">
`

const CHECKBOXES = `
  <input class="govuk-checkboxes__input" id="extras" name="extras" type="checkbox" value="breakdown">
  <input class="govuk-checkboxes__input" id="extras-2" name="extras" type="checkbox" value="legal">
`

const DATE_TRIPLE = `
  <input class="govuk-input govuk-date-input__input" id="dateOfBirth-day" name="dateOfBirth-day" type="text" inputmode="numeric">
  <input class="govuk-input govuk-date-input__input" id="dateOfBirth-month" name="dateOfBirth-month" type="text" inputmode="numeric">
  <input class="govuk-input govuk-date-input__input" id="dateOfBirth-year" name="dateOfBirth-year" type="text" inputmode="numeric">
`

const SELECT = `
  <select class="govuk-select" id="country" name="country">
    <option value="">Choose…</option>
    <option value="england">England</option>
    <option value="scotland">Scotland</option>
  </select>
`

describe('tests/helpers/extract-inputs', () => {
  it('extracts plain inputs with their type and ignores the crumb', () => {
    const controls = extractInputs(`${CRUMB}${TEXT_INPUT}${EMAIL_INPUT}`)
    expect(controls).toEqual([
      {
        name: 'fullName',
        kind: 'input',
        inputType: 'text',
        options: undefined,
        describedBy: undefined
      },
      {
        name: 'email',
        kind: 'input',
        inputType: 'email',
        options: undefined,
        describedBy: undefined
      }
    ])
  })

  it('folds a radio group to one control carrying its option values', () => {
    const controls = extractInputs(RADIO_GROUP)
    expect(controls).toContainEqual({
      name: 'voluntaryExcess',
      kind: 'radios',
      values: ['yes', 'no']
    })
    // The conditionally-revealed input still surfaces as its own control.
    expect(controls.map((control) => control.name)).toContain('excessAmount')
  })

  it('folds checkboxes by shared name', () => {
    expect(extractInputs(CHECKBOXES)).toEqual([
      { name: 'extras', kind: 'checkboxes', values: ['breakdown', 'legal'] }
    ])
  })

  it('folds a day/month/year triple into one date control', () => {
    expect(extractInputs(DATE_TRIPLE)).toEqual([
      { name: 'dateOfBirth', kind: 'date' }
    ])
  })

  it('extracts selects with their option values', () => {
    expect(extractInputs(SELECT)).toEqual([
      {
        name: 'country',
        kind: 'select',
        inputType: undefined,
        options: ['', 'england', 'scotland'],
        describedBy: undefined
      }
    ])
  })

  it('classifies textareas and file inputs', () => {
    const kinds = extractInputs(`${TEXTAREA}${FILE_INPUT}`).map(
      (control) => control.kind
    )
    expect(kinds).toEqual(['textarea', 'file'])
  })

  it('reads GDS error wiring: message id plus aria-describedby', () => {
    const html = `
      <p id="fullName-error" class="govuk-error-message">Enter your full name</p>
      <input class="govuk-input govuk-input--error" id="fullName" name="fullName" type="text" aria-describedby="fullName-error">
    `
    expect(errorWiring(html, 'fullName')).toEqual({
      hasErrorMessage: true,
      inputDescribedBy: true
    })
    expect(errorWiring(html, 'email')).toEqual({
      hasErrorMessage: false,
      inputDescribedBy: false
    })
  })

  it('reads error-summary links from the summary list only', () => {
    const html = `
      <a href="/elsewhere">nav link</a>
      <ul class="govuk-list govuk-error-summary__list">
        <li><a href="#fullName">Enter your full name</a></li>
      </ul>
    `
    expect(errorSummaryLinks(html)).toEqual(['#fullName'])
    expect(errorSummaryLinks('<p>no summary</p>')).toEqual([])
  })
})
