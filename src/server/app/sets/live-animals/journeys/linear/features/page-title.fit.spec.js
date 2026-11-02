import { expect, test } from '@playwright/test'

import {
  chooseCountryOfOrigin,
  signIn,
  startNotificationAtOrigin
} from '../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../shared/copy.en.js'
import { copy as originCopy } from './origin/copy/copy.en.js'

const { serviceName, govukSuffix, errorTitlePrefix } = sharedCopy.layout

const SUBMIT_BUTTON_SELECTOR = 'form button[type="submit"]'

test.describe('page title', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('reads page name, service name and GOV.UK, joined by hyphens', async ({
    page
  }) => {
    await expect(page).toHaveTitle(
      `${originCopy.title} - ${serviceName} - ${govukSuffix}`
    )
  })

  test('puts the error prefix in front of the whole title when the page shows errors', async ({
    page
  }) => {
    await chooseCountryOfOrigin(page)
    await page
      .getByRole('radio', { name: originCopy.regionRequirement.yes })
      .check()
    await page.locator(SUBMIT_BUTTON_SELECTOR).first().click()

    await expect(
      page
        .getByRole('alert')
        .getByRole('link', { name: originCopy.errors.regionCodeRequired })
    ).toBeVisible()
    await expect(page).toHaveTitle(
      `${errorTitlePrefix}${originCopy.title} - ${serviceName} - ${govukSuffix}`
    )
  })
})
