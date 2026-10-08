import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  completeAnswerSections,
  journeyUrl,
  openReviewFromHub,
  signIn,
  startNotification,
  urlUnderBase
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const SUBMIT_BUTTON = 'form button[type="submit"]'
const EDITED_REFERENCE = 'CHANGED-IN-ANOTHER-TAB'
const REVIEW_URL = urlUnderBase('/notifications/[^/]+/notification-view')
const CHANGED_REVIEW_URL = urlUnderBase(
  '/notifications/[^/]+/notification-view\\?staleAction=1'
)

/** The only way onto the declaration: Continue from a complete review. */
const continueFromReview = async (page) => {
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const startAtDeclaration = async (page) => {
  await startNotification(page)
  await completeAnswerSections(page)
  await openReviewFromHub(page)
  await continueFromReview(page)
}

/** Another tab, same trader, saving an answer on the same notification. */
const editInAnotherTab = async (page) => {
  const other = await page.context().newPage()
  await other.goto(journeyUrl(page, 'origin'))
  await other
    .getByLabel('Your internal reference for this consignment (optional)')
    .fill(EDITED_REFERENCE)
  await other.getByRole('button', { name: 'Save and continue' }).click()
  await other.close()
}

const expectChangedBanner = async (page) => {
  await expect(page).toHaveURL(CHANGED_REVIEW_URL)
  await expect(
    page.getByText(sharedCopy.staleActionRejected.title)
  ).toBeVisible()
}

test.describe('declaration feature', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtDeclaration(page)
  })

  test('renders every declaration statement and the current date', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { name: copy.body.contactUk })
    ).toBeVisible()
    await expect(page.getByText(copy.body.contactUkDetail)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.body.responsible, exact: true })
    ).toBeVisible()
    await expect(page.getByText(copy.body.responsibleDetail)).toBeVisible()
    for (const item of copy.body.responsibleItems) {
      await expect(page.getByText(item, { exact: true })).toBeVisible()
    }
    await expect(
      page.getByRole('heading', { name: copy.body.accountableFor })
    ).toBeVisible()
    for (const item of copy.body.accountableItems) {
      await expect(page.getByText(item, { exact: true })).toBeVisible()
    }
    await expect(page.getByText(copy.body.authorised)).toBeVisible()
    await expect(page.getByText(copy.body.legallyAct)).toBeVisible()
    await expect(
      page.getByRole('checkbox', { name: copy.declarationLabel })
    ).toBeVisible()
    await expect(
      page.getByText(new RegExp(`^${copy.dateOfDeclaration}`))
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.continueButton })
    ).toBeVisible()
  })

  test('declaration validation: when unchecked, links to and focuses the clear checkbox', async ({
    page
  }) => {
    await page.locator(SUBMIT_BUTTON).click()

    const declarationError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.declarationRequired })
    await expect(declarationError).toBeVisible()
    await expect(page.locator('.govuk-error-message')).toContainText(
      copy.errors.declarationRequired
    )
    await declarationError.click()
    await expect(
      page.getByRole('checkbox', { name: copy.declarationLabel })
    ).toBeFocused()
    await expect(
      page.getByRole('checkbox', { name: copy.declarationLabel })
    ).not.toBeChecked()
  })

  test('back link returns to check answers', async ({ page }) => {
    const backLink = page.getByRole('link', { name: 'Back', exact: true })
    await expect(backLink).toHaveAttribute(
      'href',
      new URL(journeyUrl(page, 'notification-view'), page.url()).pathname
    )

    await backLink.click()

    await expect(page).toHaveURL(REVIEW_URL)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Declaration has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })

  test('submits a complete notification, redirects to confirmation and keeps the declaration', async ({
    page
  }) => {
    const declarationUrl = journeyUrl(page, 'declaration')

    await page.getByRole('checkbox', { name: copy.declarationLabel }).check()
    await page.locator(SUBMIT_BUTTON).click()

    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/confirmation')
    )
    await page.goto(declarationUrl)
    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/confirmation')
    )
  })

  test('refuses the submit and returns to the review when the notification changed after the declaration rendered', async ({
    page
  }) => {
    await editInAnotherTab(page)

    await page.getByRole('checkbox', { name: copy.declarationLabel }).check()
    await page.locator(SUBMIT_BUTTON).click()

    await expectChangedBanner(page)
    await expect(page.getByText(EDITED_REFERENCE)).toBeVisible()
  })
})

test.describe('declaration reached only from the review', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('sends a typed or bookmarked declaration URL back to the review', async ({
    page
  }) => {
    await startNotification(page)

    await page.goto(journeyUrl(page, 'declaration'))

    await expect(page).toHaveURL(REVIEW_URL)
  })

  // Every journey page carries the current token, so a form edited in the
  // browser's developer tools could post the review's Continue without the
  // review ever being opened. The session records only the reviews it rendered.
  test('sends a hand-crafted Continue from a browser that never opened the review back to the review', async ({
    page
  }) => {
    await startNotification(page)
    await completeAnswerSections(page)

    await page.goto(journeyUrl(page, 'origin'))
    const declarationPath = new URL(journeyUrl(page, 'declaration'), page.url())
      .pathname
    await page.evaluate((action) => {
      const form = document.querySelector('form[method="post"]')
      form.action = action
      const step = document.createElement('input')
      step.type = 'hidden'
      step.name = 'step'
      step.value = 'review'
      form.append(step)
      form.submit()
    }, declarationPath)

    await expect(page).toHaveURL(REVIEW_URL)
    await expect(page.getByRole('heading', { name: copy.title })).toHaveCount(0)
  })

  test('refuses Continue and shows the current notification when it changed after the review rendered', async ({
    page
  }) => {
    await startNotification(page)
    await completeAnswerSections(page)
    await openReviewFromHub(page)

    await editInAnotherTab(page)
    await page.getByRole('button', { name: 'Continue' }).click()

    await expectChangedBanner(page)
    await expect(page.getByText(EDITED_REFERENCE)).toBeVisible()
  })
})
