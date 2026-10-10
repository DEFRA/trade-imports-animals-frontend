import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  BASE,
  signIn
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const FEEDBACK_MAILTO = 'mailto:APHAServiceDesk@apha.gov.uk'

const main = (page) => page.getByRole('main')

test.describe('manage templates', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await page.goto(`${BASE}/templates`)
  })

  test('shows the Manage templates title, heading and intro line', async ({
    page
  }) => {
    await expect(page).toHaveTitle(
      `${copy.title} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(page.getByText(copy.intro)).toBeVisible()
  })

  test('starts with its heading and offers no Back link', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveCount(0)
    await expect(main(page).getByRole('heading').first()).toHaveText(copy.title)
  })

  test('shows the Alpha phase banner with the service feedback address', async ({
    page
  }) => {
    await expect(page.getByText('Alpha', { exact: true })).toBeVisible()
    await expect(
      page.getByText('This is a new service. Help us improve it and')
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: sharedCopy.layout.phaseBanner.feedbackLinkText
      })
    ).toHaveAttribute('href', FEEDBACK_MAILTO)
  })

  test('shows a zero count and no templates under My templates when none are saved', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { level: 2, name: copy.listHeading })
    ).toBeVisible()
    await expect(
      page.getByText(copy.results.none, { exact: true })
    ).toBeVisible()
    await expect(main(page).getByRole('heading', { level: 3 })).toHaveCount(0)
    // The only body text is the intro and the results count, so there is no empty-state message.
    await expect(main(page).locator('p.govuk-body')).toHaveCount(2)
  })

  test('offers no search, filter, sort or pagination', async ({ page }) => {
    await expect(main(page).getByRole('combobox')).toHaveCount(0)
    await expect(main(page).getByRole('searchbox')).toHaveCount(0)
    await expect(main(page).getByRole('textbox')).toHaveCount(0)
    await expect(main(page).getByText('Sort by')).toHaveCount(0)
    await expect(
      page.getByRole('navigation', { name: 'Pagination' })
    ).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Next' })).toHaveCount(0)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Manage templates has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
