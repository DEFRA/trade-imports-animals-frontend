import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const CUSTOMS_ENQUIRIES_HREF =
  'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/customs-international-trade-and-excise-enquiries'
const CALL_CHARGES_HREF = 'https://www.gov.uk/call-charges'

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

const headingsOf = ($) =>
  $('main h2')
    .map((_, h) => $(h).text().trim())
    .get()

const SECTIONS_WITH_NOTHING_OUTSTANDING = [
  copy.transporting.heading,
  copy.viewOrAmend.heading,
  copy.help.heading
]

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

  it('Should show only the reference prefix and the reference number in the panel body', () => {
    const $ = load(render([]))

    expect($('.govuk-panel__body').text().trim()).toBe(
      `${copy.panel.referencePrefix}ABC-123`
    )
  })
})

describe('confirmation template outstanding-work section', () => {
  it('Should list what the trader still owes when something is outstanding', () => {
    const $ = load(render([copy.outstanding.documents]))
    const intro = $('main h2').first().next()

    expect(headingsOf($)).toEqual([
      copy.outstanding.heading,
      ...SECTIONS_WITH_NOTHING_OUTSTANDING
    ])
    expect(intro.text().trim()).toBe(copy.outstanding.intro)
    expect(
      intro
        .next('ul')
        .find('li')
        .map((_, li) => $(li).text().trim())
        .get()
    ).toEqual([copy.outstanding.documents])
  })

  it('Should show only the transport, view-or-amend and help sections when nothing is outstanding', () => {
    expect(headingsOf(load(render([])))).toEqual(
      SECTIONS_WITH_NOTHING_OUTSTANDING
    )
  })
})

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

describe('confirmation template help section', () => {
  it.each([
    ['contact HMRC', copy.help.customsLink, CUSTOMS_ENQUIRIES_HREF],
    ['call charges', copy.help.callCharges, CALL_CHARGES_HREF]
  ])(
    'Should open the %s link in a new tab and say so only to screen readers',
    (_name, linkText, href) => {
      const $ = load(render([]))
      const link = $(`a:contains("${linkText}")`)
      const hidden = link.find('.govuk-visually-hidden')

      expect(link.attr('href')).toBe(href)
      expect(link.attr('target')).toBe('_blank')
      expect(link.attr('rel')).toBe('noreferrer noopener')
      expect(hidden.text().trim()).toBe(copy.help.opensInNewTab)
      expect(link.clone().children().remove().end().text()).toBe(linkText)
    }
  )
})
