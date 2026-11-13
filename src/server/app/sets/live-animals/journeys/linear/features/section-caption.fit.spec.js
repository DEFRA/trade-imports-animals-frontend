import { expect, test } from '@playwright/test'

import {
  BASE,
  expectCaptionAboveHeading,
  expectNoSeriousOrCriticalViolations,
  signIn,
  startNotification,
  startNotificationAtImportReason,
  startNotificationAtOrigin
} from '../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../shared/copy.en.js'
import { copy as sectionCaptionsCopy } from '../flow/section-captions/copy/copy.en.js'
import { copy as dashboardCopy } from './dashboard/copy/copy.en.js'
import { copy as hubCopy } from './hub/copy/copy.en.js'
import { copy as originCopy } from './origin/copy/copy.en.js'
import { copy as importReasonCopy } from './import-reason/copy/copy.en.js'

const ABOUT_THE_CONSIGNMENT = 'About the consignment'

test.describe('section caption above the page heading', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('names the section immediately above the heading of a consignment question', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)

    await expectCaptionAboveHeading(page, {
      captionText: ABOUT_THE_CONSIGNMENT,
      headingName: originCopy.title
    })
  })

  test('puts the section caption above the heading of a page whose question is a legend', async ({
    page
  }) => {
    await startNotificationAtImportReason(page)

    await expectCaptionAboveHeading(page, {
      captionText: ABOUT_THE_CONSIGNMENT,
      headingName: importReasonCopy.title
    })
  })

  test('names the dashboard above its heading', async ({ page }) => {
    await page.goto(BASE)

    await expectCaptionAboveHeading(page, {
      captionText: sectionCaptionsCopy.sections.dashboard,
      headingName: dashboardCopy.title
    })
  })

  test('puts only the draft status strip before the overview heading, with no section caption', async ({
    page
  }) => {
    await startNotification(page)

    const title = page.getByRole('heading', { level: 1 })
    await expect(title).toHaveAccessibleName(hubCopy.title)
    const beforeTitle = title.locator('xpath=preceding-sibling::*')
    await expect(beforeTitle).toHaveCount(1)
    await expect(beforeTitle).toContainText(sharedCopy.journeyStrip.draft)
  })

  test('has no serious or critical axe violations with a caption on the page', async ({
    page
  }) => {
    await startNotificationAtImportReason(page)

    await expect(
      page.getByText(ABOUT_THE_CONSIGNMENT, { exact: true })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Captioned page')
  })
})
