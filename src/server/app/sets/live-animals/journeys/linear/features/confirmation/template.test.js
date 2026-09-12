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
      submissionDate: '12 December 2025',
      outstandingItems,
      dashboardHref: '/',
      createAction: '/notifications',
      crumb: 'test-crumb'
    }
  )

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
