import { describe, it, expect } from 'vitest'
import { loadFlow, render } from './test-helpers.js'

const flow = loadFlow()
const quotePage = flow.sections
  .flatMap((section) => section.children)
  .find((child) => child.id === 'quote-summary')

const renderQuote = (overrides = {}) =>
  render('quote-summary.njk', {
    pageTitle: quotePage.title,
    heading: quotePage.heading,
    quoteCopy: quotePage.quoteCopy,
    buttonText: quotePage.buttonText,
    crumb: 'token',
    ...overrides
  })

describe('templates/quote-summary — the system-handled quote result', () => {
  it('renders the pinned heading, premium and accept button', () => {
    const html = renderQuote({
      premium: 250,
      coverLabel: 'Comprehensive',
      extras: ['Breakdown cover']
    })
    expect(html).toContain('<h1 class="govuk-heading-l">Your quote</h1>')
    expect(html).toContain('Estimated annual premium:')
    expect(html).toContain('£250')
    expect(html).toContain('Accept and continue')
  })

  it('summarises cover and extras with the pinned row keys', () => {
    const html = renderQuote({
      premium: 250,
      coverLabel: 'Comprehensive',
      extras: ['Breakdown cover', 'Courtesy car']
    })
    expect(html).toContain('Cover')
    expect(html).toContain('Comprehensive')
    expect(html).toContain('Breakdown cover, Courtesy car')
  })

  it('shows None when no extras are chosen', () => {
    expect(renderQuote({ premium: 250, extras: [] })).toContain('None')
  })

  it('prices a half-empty journey without throwing (open access)', () => {
    const html = renderQuote()
    expect(html).toContain('<h1 class="govuk-heading-l">Your quote</h1>')
    expect(html).toContain(quotePage.quoteCopy.disclaimer)
  })
})
