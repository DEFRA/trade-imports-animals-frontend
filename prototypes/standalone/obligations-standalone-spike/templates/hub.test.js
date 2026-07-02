import { describe, it, expect } from 'vitest'
import { loadFlow, render } from './test-helpers.js'

const flow = loadFlow()

const items = [
  {
    title: { text: 'Email' },
    href: '/email',
    status: { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
  },
  {
    title: { text: 'About you' },
    href: '/about-you',
    status: { tag: { text: 'In progress', classes: 'govuk-tag--light-blue' } }
  },
  {
    title: { text: flow.hub.quoteRowTitle },
    status: { text: flow.hub.cannotStartYetText }
  }
]

const renderHub = () =>
  render('hub.njk', {
    pageTitle: flow.hub.heading,
    heading: flow.hub.heading,
    progressLine: 'You have completed 0 of 7 tasks.',
    items
  })

describe('templates/hub — pure pass-through over the hub view-model', () => {
  it('renders the pinned heading and progress line', () => {
    const html = renderHub()
    expect(html).toContain(
      '<h1 class="govuk-heading-xl">Get a car insurance quote</h1>'
    )
    expect(html).toContain('You have completed 0 of 7 tasks.')
  })

  const taskRows = (html) =>
    html.match(/<li class="govuk-task-list__item[\s\S]*?<\/li>/g)

  it('renders exactly the given task rows — never a bespoke CYA row', () => {
    expect(taskRows(renderHub())).toHaveLength(items.length)
  })

  it('renders Cannot start yet as plain status text on an inert row', () => {
    const quoteRow = taskRows(renderHub()).find((row) =>
      row.includes('Get your quote')
    )
    expect(quoteRow).toContain('Cannot start yet')
    expect(quoteRow).not.toContain('<a')
  })

  it('links started rows and tags their statuses', () => {
    const html = renderHub()
    expect(html).toMatch(/href="\/about-you"/)
    expect(html).toContain('In progress')
  })
})
