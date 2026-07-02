import { describe, it, expect } from 'vitest'
import { loadFlow, render } from './test-helpers.js'

const flow = loadFlow()
const claimsPage = flow.sections
  .flatMap((section) => section.children)
  .find((child) => child.id === 'claims')

const claimRow = (index) => ({
  key: { text: `Claim ${index}` },
  value: { text: 'Accident — £250' },
  actions: {
    items: [
      {
        href: '/claims/remove/0',
        text: 'Remove',
        visuallyHiddenText: `claim ${index}`
      }
    ]
  }
})

const renderList = (rows) =>
  render('claims-list.njk', {
    pageTitle: claimsPage.title,
    heading: claimsPage.heading,
    listCopy: claimsPage.listCopy,
    crumb: 'token',
    rows
  })

describe('templates/claims-list — the bespoke manage-list frame', () => {
  it('renders the empty state with the Add a claim button', () => {
    const html = renderList([])
    expect(html).toContain('You have not added any claims yet.')
    expect(html).toContain('Add a claim')
    expect(html).not.toContain('Add another claim')
    expect(html).not.toContain('govuk-summary-list')
  })

  it('renders Claim N rows and toggles to Add another claim', () => {
    const html = renderList([claimRow(1)])
    expect(html).toContain('Claim 1')
    expect(html).toContain('Add another claim')
    expect(html).toContain('govuk-summary-list')
  })

  it('gives each row a Remove claim N accessible name', () => {
    expect(renderList([claimRow(1)])).toMatch(
      /Remove<span class="govuk-visually-hidden"> claim 1<\/span>/
    )
  })

  it('posts add and continue as distinct actions of one form', () => {
    const html = renderList([claimRow(1)])
    expect(html).toMatch(/<button[^>]*value="add"[^>]*name="action"[^>]*>/)
    expect(html).toMatch(/<button[^>]*value="continue"[^>]*name="action"[^>]*>/)
    expect(html).toContain('Continue')
  })
})
