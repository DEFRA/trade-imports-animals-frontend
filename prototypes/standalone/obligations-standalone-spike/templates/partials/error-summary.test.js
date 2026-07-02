import { describe, it, expect } from 'vitest'
import { renderString, TEMPLATES } from '../test-helpers.js'

const renderPartial = (context) =>
  renderString(
    `{% include "${TEMPLATES}/partials/error-summary.njk" %}`,
    context
  )

describe('templates/partials/error-summary — the hard-mandate round trip', () => {
  it('renders the GDS error summary with anchored field links', () => {
    const html = renderPartial({
      errorSummaryTitle: 'There is a problem',
      errorSummary: [{ text: 'Enter your full name', href: '#fullName' }]
    })
    expect(html).toContain('govuk-error-summary')
    expect(html).toContain('There is a problem')
    expect(html).toContain('<a href="#fullName">Enter your full name</a>')
  })

  it('falls back to the standard GDS title when none is given', () => {
    const html = renderPartial({
      errorSummary: [{ text: 'Enter your full name', href: '#fullName' }]
    })
    expect(html).toContain('There is a problem')
  })

  it('renders nothing when there are no errors', () => {
    expect(renderPartial({}).trim()).toBe('')
    expect(renderPartial({ errorSummary: [] }).trim()).toBe('')
  })
})
