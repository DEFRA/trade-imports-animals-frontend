import { describe, it, expect } from 'vitest'
import { render } from './test-helpers.js'

describe('templates/layout — the shared journey chrome', () => {
  it('renders the full govuk template on an empty context', () => {
    const html = render('layout.njk', {})
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('govuk-template')
    expect(html).toContain('govuk-phase-banner')
    expect(html).toContain('govuk-service-navigation')
    expect(html).toContain('govuk-breadcrumbs')
  })

  it('titles the page with the spike suffix', () => {
    const html = render('layout.njk', { pageTitle: 'About you' })
    expect(html).toContain(
      '<title>About you | Car insurance (obligations spike, standalone)</title>'
    )
  })

  it('prefixes the title with Error: only when errors are present', () => {
    const errored = render('layout.njk', {
      pageTitle: 'About you',
      errorSummary: [{ text: 'Enter your full name', href: '#fullName' }]
    })
    expect(errored).toContain('<title>Error: About you |')
    expect(render('layout.njk', { pageTitle: 'About you' })).not.toContain(
      'Error:'
    )
  })

  it('renders a back link only when the view provides one', () => {
    const html = render('layout.njk', { backLink: '/somewhere' })
    expect(html).toContain(
      '<a href="/somewhere" class="govuk-back-link">Back</a>'
    )
    expect(render('layout.njk', {})).not.toContain('govuk-back-link')
  })

  it('names the service and links it to the journey base path', () => {
    const html = render('layout.njk', {})
    expect(html).toContain(
      'Car insurance — obligations spike (standalone, obligations engine)'
    )
    expect(html).toContain(
      '/prototype-standalone/obligations-standalone-spike/task-list-with-linear-tasks'
    )
  })
})
