import { describe, it, expect } from 'vitest'
import { loadFlow, render } from './test-helpers.js'

const flow = loadFlow()

const renderConfirmation = () =>
  render('confirmation.njk', {
    pageTitle: flow.confirmation.panelTitle,
    confirmation: flow.confirmation,
    reference: 'CI-AB12CD',
    premium: 250
  })

describe('templates/confirmation — the terminal Quote confirmed panel', () => {
  it('renders the pinned govuk panel with the reference', () => {
    const html = renderConfirmation()
    expect(html).toContain('govuk-panel--confirmation')
    expect(html).toContain('Quote confirmed')
    expect(html).toContain('Your reference number')
    expect(html).toContain('<strong>CI-AB12CD</strong>')
  })

  it('interpolates the saved premium into the Flow copy', () => {
    expect(renderConfirmation()).toContain(
      'We have saved your quote of £250 per year.'
    )
  })

  it('renders the what-happens-next copy and the return link', () => {
    const html = renderConfirmation()
    expect(html).toContain('What happens next')
    expect(html).toContain(flow.confirmation.nextBody)
    expect(html).toMatch(
      /<a class="govuk-link" href="\/prototype-standalone">Return to the standalone prototype list<\/a>/
    )
  })
})
