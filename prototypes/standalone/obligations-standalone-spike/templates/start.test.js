import { describe, it, expect } from 'vitest'
import { loadFlow, render } from './test-helpers.js'

const flow = loadFlow()

const renderStart = () =>
  render('start.njk', {
    pageTitle: flow.start.heading,
    start: flow.start,
    startAction: '/start',
    crumb: 'token'
  })

describe('templates/start — the read-only Flow front door', () => {
  it('renders the pinned h1 from the Flow start copy', () => {
    expect(renderStart()).toContain(
      '<h1 class="govuk-heading-xl">Get a car insurance quote</h1>'
    )
  })

  it('renders the Start now button as a govuk start button', () => {
    const html = renderStart()
    expect(html).toContain('govuk-button--start')
    expect(html).toContain('Start now')
  })

  it('posts the start form to the given action with the crumb', () => {
    const html = renderStart()
    expect(html).toContain('<form method="post" action="/start" novalidate>')
    expect(html).toContain('name="crumb" value="token"')
  })

  it('carries the Flow body copy through untouched', () => {
    expect(renderStart()).toContain(flow.start.body)
  })
})
