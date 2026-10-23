import { expect, test } from '@playwright/test'

import {
  BASE,
  expectNoSeriousOrCriticalViolations,
  signIn,
  startNotification,
  startNotificationAtImportReason,
  startNotificationAtOrigin
} from '../../../../../../../../fit/live-animals-journey.js'
import { copy as sectionCaptionsCopy } from '../flow/section-captions/copy/copy.en.js'
import { copy as dashboardCopy } from './dashboard/copy/copy.en.js'
import { copy as originCopy } from './origin/copy/copy.en.js'
import { copy as importReasonCopy } from './import-reason/copy/copy.en.js'

const ANY_GOVUK_CAPTION =
  '.govuk-caption-s, .govuk-caption-m, .govuk-caption-l, .govuk-caption-xl'
const ABOUT_THE_CONSIGNMENT = 'About the consignment'

test.describe('section caption above the page heading', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('names the section immediately above the heading of a consignment question', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)

    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(originCopy.title)
    await expect(page.locator(ANY_GOVUK_CAPTION)).toHaveText(
      ABOUT_THE_CONSIGNMENT
    )
  })

  test('names the section on a page whose question is a hidden legend', async ({
    page
  }) => {
    await startNotificationAtImportReason(page)

    await expect(page.locator(ANY_GOVUK_CAPTION)).toHaveText(
      ABOUT_THE_CONSIGNMENT
    )
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(importReasonCopy.title)
    await expect(
      page.locator('legend').filter({ hasText: importReasonCopy.legend })
    ).toHaveClass(/govuk-visually-hidden/)
  })

  test('names the dashboard above its heading', async ({ page }) => {
    await page.goto(BASE)

    await expect(
      page.locator('span.govuk-caption-xl + h1.govuk-heading-xl')
    ).toHaveText(dashboardCopy.title)
    await expect(page.locator('span.govuk-caption-xl')).toHaveText(
      sectionCaptionsCopy.sections.dashboard
    )
  })

  test('leaves the overview with no section caption', async ({ page }) => {
    await startNotification(page)

    await expect(page.locator(ANY_GOVUK_CAPTION)).toHaveCount(0)
  })

  test('has no serious or critical axe violations with a caption on the page', async ({
    page
  }) => {
    await startNotificationAtImportReason(page)

    await expect(page.locator(ANY_GOVUK_CAPTION)).toHaveText(
      ABOUT_THE_CONSIGNMENT
    )

    await expectNoSeriousOrCriticalViolations(page, 'Captioned page')
  })
})
