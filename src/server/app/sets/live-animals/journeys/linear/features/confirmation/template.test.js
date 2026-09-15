import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const render = (outstandingItems) =>
  environment.render(
    'live-animals/journeys/linear/features/confirmation/template.njk',
    {
      pageTitle: copy.title,
      sharedCopy,
      copy,
      userSession: { isAuthenticated: true, displayName: 'Sam Example' },
      getAssetPath: (asset) => `/assets/${asset}`,
      referenceNumber: 'ABC-123',
      outstandingItems,
      dashboardHref: '/',
      createAction: '/notifications',
      crumb: 'test-crumb'
    }
  )

// Design release 1 goes from the reference panel straight into what the trader
// has to do. Nothing — the declaration date least of all — sits in between.
describe('confirmation template panel', () => {
  it('Should follow the panel with what the trader still has to do', () => {
    const $ = load(render([copy.outstanding.documents]))
    const afterPanel = $('.govuk-panel').nextAll().first()

    expect(afterPanel.is('h2')).toBe(true)
    expect(afterPanel.text().trim()).toBe(copy.outstanding.heading)
  })

  it('Should follow the panel with the transport guidance when nothing is outstanding', () => {
    const $ = load(render([]))
    const afterPanel = $('.govuk-panel').nextAll().first()

    expect(afterPanel.is('h2')).toBe(true)
    expect(afterPanel.text().trim()).toBe(copy.transporting.heading)
  })

  it('Should not print a date of declaration', () => {
    expect(load(render([])).text()).not.toMatch(/date of declaration/i)
  })
})

describe('confirmation template outstanding-work section', () => {
  it('Should list what the trader still owes when something is outstanding', () => {
    const $ = load(render([copy.outstanding.documents]))
    const headings = $('h2')
      .map((_, h) => $(h).text().trim())
      .get()

    expect(headings).toContain(copy.outstanding.heading)
    expect($.text()).toContain(copy.outstanding.intro)
    expect(
      $('li')
        .map((_, li) => $(li).text().trim())
        .get()
    ).toContain(copy.outstanding.documents)
  })

  it('Should drop the section entirely when nothing is outstanding', () => {
    const html = render([])

    expect(html).not.toContain(copy.outstanding.heading)
    expect(html).not.toContain(copy.outstanding.intro)
  })
})

// A trader with a second consignment to notify should not have to go back to
// the dashboard to find the start button, so this section offers both routes.
describe('confirmation template view-or-amend section', () => {
  it('Should link back to the dashboard', () => {
    const $ = load(render([]))

    expect(
      $(`a:contains("${copy.viewOrAmend.dashboardLink}")`).attr('href')
    ).toBe('/')
  })

  it('Should post the create-a-new-notification control to the create route', () => {
    const $ = load(render([]))
    const control = $(`button:contains("${copy.viewOrAmend.createButton}")`)
    const form = control.closest('form')

    expect(control).toHaveLength(1)
    expect(form.attr('method')).toBe('post')
    expect(form.attr('action')).toBe('/notifications')
    expect(form.find('input[name="crumb"]').attr('value')).toBe('test-crumb')
  })

  it('Should place the create control between the dashboard link and the help section', () => {
    const $ = load(render([]))
    const html = $.html()

    expect(html.indexOf(copy.viewOrAmend.createButton)).toBeGreaterThan(
      html.indexOf(copy.viewOrAmend.dashboardLink)
    )
    expect(html.indexOf(copy.viewOrAmend.createButton)).toBeLessThan(
      html.indexOf(copy.help.heading)
    )
  })
})

// HMRC's contact index lists every tax and every helpline. A trader who has
// just submitted an import notification wants one desk, so the link goes
// straight to the customs, international trade and excise enquiries page.
describe('confirmation template help section', () => {
  it('Should send the customs link to HMRC customs enquiries, not the contact index', () => {
    const $ = load(render([]))

    expect($(`a:contains("${copy.help.customsLink}")`).attr('href')).toBe(
      'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/customs-international-trade-and-excise-enquiries'
    )
  })
})
