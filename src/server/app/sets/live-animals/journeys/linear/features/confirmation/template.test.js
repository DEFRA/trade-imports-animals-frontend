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
      dashboardHref: '/'
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
