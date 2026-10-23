import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import {
  documentOf,
  trimmedTextOf
} from '../../../../../../../common/test-helpers/document-of.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const CUSTOMS_ENQUIRIES_HREF =
  'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/customs-international-trade-and-excise-enquiries'
const CALL_CHARGES_HREF = 'https://www.gov.uk/call-charges'

const render = (outstandingItems) =>
  documentOf(
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
  )

const headingsOf = (document) =>
  [...document.querySelectorAll('main h2')].map(trimmedTextOf)

const firstContaining = (document, selector, text) =>
  [...document.querySelectorAll(selector)].find(({ textContent }) =>
    textContent.includes(text)
  )

const ownTextOf = (element) =>
  [...element.childNodes]
    .filter(({ nodeType }) => nodeType === element.TEXT_NODE)
    .map(({ textContent }) => textContent)
    .join('')

const SECTIONS_WITH_NOTHING_OUTSTANDING = [
  copy.transporting.heading,
  copy.viewOrAmend.heading,
  copy.help.heading
]

describe('confirmation template panel', () => {
  it('Should follow the panel with what the trader still has to do', () => {
    const afterPanel = render([copy.outstanding.documents]).querySelector(
      '.govuk-panel'
    ).nextElementSibling

    expect(afterPanel.matches('h2')).toBe(true)
    expect(trimmedTextOf(afterPanel)).toBe(copy.outstanding.heading)
  })

  it('Should follow the panel with the transport guidance when nothing is outstanding', () => {
    const afterPanel = render([]).querySelector(
      '.govuk-panel'
    ).nextElementSibling

    expect(afterPanel.matches('h2')).toBe(true)
    expect(trimmedTextOf(afterPanel)).toBe(copy.transporting.heading)
  })

  it('Should show only the reference prefix and the reference number in the panel body', () => {
    expect(trimmedTextOf(render([]).querySelector('.govuk-panel__body'))).toBe(
      `${copy.panel.referencePrefix}ABC-123`
    )
  })
})

describe('confirmation template outstanding-work section', () => {
  it('Should list what the trader still owes when something is outstanding', () => {
    const document = render([copy.outstanding.documents])
    const intro = document.querySelector('main h2').nextElementSibling
    const list = intro.nextElementSibling

    expect(headingsOf(document)).toEqual([
      copy.outstanding.heading,
      ...SECTIONS_WITH_NOTHING_OUTSTANDING
    ])
    expect(trimmedTextOf(intro)).toBe(copy.outstanding.intro)
    expect(list.matches('ul')).toBe(true)
    expect([...list.querySelectorAll('li')].map(trimmedTextOf)).toEqual([
      copy.outstanding.documents
    ])
  })

  it('Should show only the transport, view-or-amend and help sections when nothing is outstanding', () => {
    expect(headingsOf(render([]))).toEqual(SECTIONS_WITH_NOTHING_OUTSTANDING)
  })
})

describe('confirmation template view-or-amend section', () => {
  it('Should link back to the dashboard', () => {
    const link = firstContaining(
      render([]),
      'a',
      copy.viewOrAmend.dashboardLink
    )

    expect(link.getAttribute('href')).toBe('/')
  })

  it('Should post the create-a-new-notification control to the create route', () => {
    const document = render([])
    const controls = [...document.querySelectorAll('button')].filter(
      ({ textContent }) => textContent.includes(copy.viewOrAmend.createButton)
    )
    const form = controls[0].closest('form')

    expect(controls).toHaveLength(1)
    expect(form.getAttribute('method')).toBe('post')
    expect(form.getAttribute('action')).toBe('/notifications')
    expect(
      form.querySelector('input[name="crumb"]').getAttribute('value')
    ).toBe('test-crumb')
  })

  it('Should place the create control between the dashboard link and the help section', () => {
    const html = render([]).documentElement.outerHTML

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
      const link = firstContaining(render([]), 'a', linkText)
      const hidden = link.querySelector('.govuk-visually-hidden')

      expect(link.getAttribute('href')).toBe(href)
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noreferrer noopener')
      expect(trimmedTextOf(hidden)).toBe(copy.help.opensInNewTab)
      expect(ownTextOf(link)).toBe(linkText)
    }
  )
})
