import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'
import { sortOptions } from './view-model/sort-options.js'

// The only place the unavailable-action banner's rendered HTML is exercised.
// It can never be an E2E: the DELETED row that triggers it is filtered out of
// the list twice before the page renders.

const environment = nunjucksConfig.options.compileOptions.environment

const renderDashboard = (actionUnavailable) =>
  environment.render(
    'live-animals/journeys/linear/features/dashboard/template.njk',
    {
      pageTitle: copy.title,
      copy,
      sharedCopy,
      startAction: '/notifications',
      listAction: '/',
      notificationRows: [],
      resultsLabel: 'No notifications found',
      pagination: null,
      currentPage: 1,
      sort: 'arrivalDate,desc',
      referenceNumber: '',
      sortOptions,
      listQuerySuffix: '',
      recoverableError: false,
      deletionSucceeded: false,
      actionUnavailable,
      breadcrumbs: false,
      userSession: { isAuthenticated: false },
      getAssetPath: (asset) => `/assets/${asset}`
    }
  )

describe('dashboard unavailable-action banner', () => {
  it('Should render an important banner naming the action that could not proceed', () => {
    const html = renderDashboard('amend')

    expect(html).toContain('You cannot amend this notification')
    expect(html).toContain(
      'It may have been deleted or changed since the list was loaded. Refresh the list and try again.'
    )
    expect(html).toMatch(/<div[^>]*class="govuk-notification-banner"/)
    expect(html).toMatch(
      /<div[^>]*class="govuk-notification-banner"[^>]*role="alert"/
    )
    expect(html).not.toContain('govuk-notification-banner--success')
  })

  it('Should title the banner per action', () => {
    expect(renderDashboard('delete')).toContain(
      'You cannot delete this notification'
    )
    expect(renderDashboard('cancelAmend')).toContain(
      'You cannot cancel this amendment'
    )
  })

  it('Should render no banner when no action reported a problem', () => {
    const html = renderDashboard(undefined)

    expect(html).not.toContain('govuk-notification-banner')
  })
})
