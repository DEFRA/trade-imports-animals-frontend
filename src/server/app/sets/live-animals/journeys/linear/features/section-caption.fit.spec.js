import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerOriginEntry,
  journeyUrl,
  signIn,
  startNotification
} from '../../../../../../../../fit/live-animals-journey.js'
import { copy as sectionCaptionsCopy } from '../flow/section-captions/copy/copy.en.js'
import { copy as dashboardCopy } from './dashboard/copy/copy.en.js'
import { copy as originCopy } from './origin/copy/copy.en.js'
import { copy as importReasonCopy } from './import-reason/copy/copy.en.js'

const ANY_GOVUK_CAPTION =
  '.govuk-caption-s, .govuk-caption-m, .govuk-caption-l, .govuk-caption-xl'
const ABOUT_THE_CONSIGNMENT = 'About the consignment'

const startAtOrigin = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
}

/** Import reason is the first page whose heading is the question legend. */
const startAtImportReason = async (page) => {
  await startAtOrigin(page)
  await answerOriginEntry(page)
  await page.goto(journeyUrl(page, 'import-reason'))
  await expect(
    page.getByRole('heading', { name: importReasonCopy.legend })
  ).toBeVisible()
}

test.describe('section caption above the page heading', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('names the section immediately above the heading of a consignment question', async ({
    page
  }) => {
    await startAtOrigin(page)

    // The selector pins placement: the caption must be the element directly
    // above the page heading, not text floating elsewhere in the content.
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(originCopy.title)
    await expect(page.locator(ANY_GOVUK_CAPTION)).toHaveText(
      ABOUT_THE_CONSIGNMENT
    )
  })

  test('names the section on a page whose heading is the question legend', async ({
    page
  }) => {
    await startAtImportReason(page)

    await expect(page.locator(ANY_GOVUK_CAPTION)).toHaveText(
      ABOUT_THE_CONSIGNMENT
    )
    await expect(page.locator('.govuk-caption-l + form h1')).toHaveText(
      importReasonCopy.legend
    )
  })

  test('names the dashboard above its heading', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.locator('span.govuk-caption-xl + h1.govuk-heading-xl')
    ).toHaveText(dashboardCopy.title)
    await expect(page.locator('span.govuk-caption-xl')).toHaveText(
      sectionCaptionsCopy.sections.dashboard
    )
  })

  test('leaves the overview bare, as Design release 1 does', async ({
    page
  }) => {
    await startNotification(page)

    await expect(page.locator(ANY_GOVUK_CAPTION)).toHaveCount(0)
  })

  test('has no serious or critical axe violations with a caption on the page', async ({
    page
  }) => {
    await startAtImportReason(page)

    await expect(page.locator(ANY_GOVUK_CAPTION)).toHaveText(
      ABOUT_THE_CONSIGNMENT
    )

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Captioned page has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
