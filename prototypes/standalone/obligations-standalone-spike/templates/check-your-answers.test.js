import { describe, it, expect } from 'vitest'
import { loadFlow, render } from './test-helpers.js'

const flow = loadFlow()
const cya = flow.checkYourAnswers

const row = (key, value, actions = true) => ({
  key: { text: key },
  value: { text: value },
  ...(actions
    ? {
        actions: {
          items: [
            {
              href: '/driving-history?change=1',
              text: cya.changeActionText,
              visuallyHiddenText: key.toLowerCase()
            }
          ]
        }
      }
    : {})
})

const renderCya = (overrides = {}) =>
  render('check-your-answers.njk', {
    pageTitle: cya.heading,
    heading: cya.heading,
    bannerHeading: cya.bannerHeading,
    sendHeading: cya.sendHeading,
    sendBody: cya.sendBody,
    premiumLead: cya.premiumLead,
    buttonText: cya.buttonText,
    errorSummaryTitle: 'There is a problem',
    crumb: 'token',
    rows: [row('Recent claims', 'Yes')],
    prompts: [],
    submitted: false,
    ...overrides
  })

describe('templates/check-your-answers — rows, prompts and the hard gate', () => {
  it('composes the Change recent claims accessible name from the row', () => {
    const html = renderCya()
    expect(html).toMatch(
      /Change<span class="govuk-visually-hidden"> recent claims<\/span>/
    )
    expect(html).toContain('/driving-history?change=1')
  })

  it('renders the soft you-still-need-to banner for a mid-journey CYA', () => {
    const html = renderCya({
      prompts: [
        {
          href: '/claims',
          text: 'Add at least one claim',
          because: ['because you said you had claims in the last 5 years']
        }
      ]
    })
    expect(html).toContain('govuk-notification-banner')
    expect(html).toContain('You still need to complete some sections')
    expect(html).toContain('Add at least one claim')
    expect(html).toContain(
      'because you said you had claims in the last 5 years'
    )
  })

  it('omits the banner when nothing is missing', () => {
    expect(renderCya()).not.toContain('govuk-notification-banner')
  })

  it('renders the stale-recheck error summary above the h1', () => {
    const html = renderCya({
      errorSummary: [{ text: 'Add at least one claim', href: '/claims' }]
    })
    expect(html.indexOf('govuk-error-summary')).toBeLessThan(
      html.indexOf('<h1')
    )
    expect(html).toContain('<a href="/claims">Add at least one claim</a>')
  })

  it('shows the premium line and the Accept and get quote form pre-submit', () => {
    const html = renderCya({ premium: 250 })
    expect(html).toContain('Estimated annual premium:')
    expect(html).toContain('£250')
    expect(html).toContain('Now send your application')
    expect(html).toContain('Accept and get quote')
  })

  it('drops the send section entirely once submitted (read-only CYA)', () => {
    const html = renderCya({
      submitted: true,
      rows: [row('Recent claims', 'Yes', false)]
    })
    expect(html).not.toContain('<form')
    expect(html).not.toContain('Accept and get quote')
    expect(html).not.toContain('Now send your application')
    expect(html).not.toContain('Change<span')
  })
})
