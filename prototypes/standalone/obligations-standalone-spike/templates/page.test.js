import { describe, it, expect } from 'vitest'
import { slotViews } from '../lib/fields/index.js'
import { render } from './test-helpers.js'

const fields = () =>
  slotViews([
    { inputName: 'fullName', label: 'Full name', type: 'text' },
    {
      inputName: 'preferredName',
      label: 'What should we call you?',
      type: 'text'
    }
  ])

const renderPage = (overrides = {}) =>
  render('page.njk', {
    pageTitle: 'About you',
    heading: 'About you',
    buttonText: 'Save and continue',
    errorSummaryTitle: 'There is a problem',
    backLink: '/hub',
    crumb: 'token',
    fields: fields(),
    ...overrides
  })

describe('templates/page — the generic presents-page template', () => {
  it('renders the heading, fields and save button with zero hardcoded copy', () => {
    const html = renderPage()
    expect(html).toContain('<h1 class="govuk-heading-l">About you</h1>')
    expect(html).toContain('name="fullName"')
    expect(html).toContain('name="preferredName"')
    expect(html).toContain('Save and continue')
    expect(html).toContain('name="crumb" value="token"')
  })

  it('renders the error summary above the h1 on a blocked save', () => {
    const html = renderPage({
      errorSummary: [{ text: 'Enter your full name', href: '#fullName' }],
      fields: slotViews(
        [{ inputName: 'fullName', label: 'Full name', type: 'text' }],
        { fullName: 'Enter your full name' }
      )
    })
    expect(html).toContain('<a href="#fullName">Enter your full name</a>')
    expect(html.indexOf('govuk-error-summary')).toBeLessThan(
      html.indexOf('<h1')
    )
    expect(html).toContain('id="fullName-error"')
  })

  it('tolerates a page presenting no user-facing fields', () => {
    const html = renderPage({ fields: [] })
    expect(html).toContain('<h1 class="govuk-heading-l">About you</h1>')
    expect(html).not.toContain('govuk-input')
  })

  it('never emits a required attribute', () => {
    expect(renderPage()).not.toContain(' required')
  })

  it('keeps the hub reachable through the back link', () => {
    expect(renderPage()).toContain(
      '<a href="/hub" class="govuk-back-link">Back</a>'
    )
  })
})
