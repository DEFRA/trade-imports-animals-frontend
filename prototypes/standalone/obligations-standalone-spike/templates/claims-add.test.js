import { describe, it, expect } from 'vitest'
import { slotViews } from '../lib/fields/index.js'
import { loadFlow, render } from './test-helpers.js'

const flow = loadFlow()
const claimsPage = flow.sections
  .flatMap((section) => section.children)
  .find((child) => child.id === 'claims')

const fields = (errors = null) =>
  slotViews(
    [
      {
        inputName: 'claimType__f1',
        label: 'What type of claim was it?',
        type: 'radio',
        options: [{ value: 'accident', label: 'Accident' }]
      },
      {
        inputName: 'claimAmount__f1',
        label: 'Approximate claim amount',
        type: 'currency'
      }
    ],
    errors
  )

const renderAdd = (overrides = {}) =>
  render('claims-add.njk', {
    pageTitle: claimsPage.addPage.heading,
    heading: claimsPage.addPage.heading,
    buttonText: claimsPage.addPage.buttonText,
    errorSummaryTitle: 'There is a problem',
    crumb: 'token',
    fields: fields(),
    ...overrides
  })

describe('templates/claims-add — the bespoke add sub-page', () => {
  it('renders the pinned heading and the fields via the generic projection', () => {
    const html = renderAdd()
    expect(html).toContain('<h1 class="govuk-heading-l">Add a claim</h1>')
    expect(html).toContain('name="claimType__f1"')
    expect(html).toContain('name="claimAmount__f1"')
  })

  it('labels the button exactly Add claim', () => {
    const [, buttonText] = renderAdd().match(
      /<button[^>]*class="govuk-button"[^>]*>\s*([^<]+?)\s*<\/button>/
    )
    expect(buttonText).toBe('Add claim')
  })

  it('round-trips a GDS error summary above the h1', () => {
    const html = renderAdd({
      errorSummary: [
        { text: 'Claim amount must be an amount', href: '#claimAmount__f1' }
      ],
      fields: fields({ claimAmount__f1: 'Claim amount must be an amount' })
    })
    expect(html.indexOf('govuk-error-summary')).toBeLessThan(
      html.indexOf('<h1')
    )
    expect(html).toContain('id="claimAmount__f1-error"')
  })
})
