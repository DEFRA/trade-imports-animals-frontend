import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  BASE,
  chooseCountryOfOrigin,
  completeAnswerSections,
  journeyIdFromPage,
  openReviewFromHub,
  signIn,
  startNotification,
  values
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const TAG = '.govuk-tag'
const strip = (page) => page.locator('.app-journey-strip')
const cancelAmendLink = (page) =>
  strip(page).getByRole('link', {
    name: sharedCopy.journeyStrip.cancelAmend,
    exact: true
  })

const expectAmendStrip = async (page) => {
  await expect(strip(page).locator(TAG)).toHaveText(
    sharedCopy.journeyStrip.amend
  )
  await expect(cancelAmendLink(page)).toBeVisible()
}

const submitNotification = async (page) => {
  await startNotification(page)
  await completeAnswerSections(page)
  await openReviewFromHub(page)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page
    .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
    .check()
  await page.getByRole('button', { name: 'Continue' }).click()
  return journeyIdFromPage(page)
}

const amendAndOpenCancel = async (page, reference) => {
  await page.goto(BASE)
  await page
    .getByRole('button', { name: `Amend notification ${reference}` })
    .click()
  await expectAmendStrip(page)
  await page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()
  await expectAmendStrip(page)
  await chooseCountryOfOrigin(page, 'France')
  await page
    .getByLabel('Your internal reference for this consignment (optional)')
    .fill('DiscardMe99')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await openReviewFromHub(page)
  await cancelAmendLink(page).click()
}

const expectAxeClean = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('cancel-amend feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    const reference = await submitNotification(page)
    await amendAndOpenCancel(page, reference)
  })

  test('renders confirmation copy, actions and review back link', async ({
    page
  }) => {
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(page.getByText(copy.body)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.confirmButton })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: copy.noLink })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', /\/notifications\/[^/]+\/notification-view$/)
  })

  test('No keeps the amendment and its changed value', async ({ page }) => {
    await page.getByRole('button', { name: copy.noLink }).click()

    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title })
    ).toBeVisible()
    await expectAmendStrip(page)
    await expect(page.getByText('DiscardMe99', { exact: true })).toBeVisible()
  })

  test('Cancel amend on a question page opens the confirmation page', async ({
    page
  }) => {
    await page.goto(`${BASE}/notifications/${journeyIdFromPage(page)}/origin`)
    await expectAmendStrip(page)

    await cancelAmendLink(page).click()

    await expect(page).toHaveURL(/\/cancel-amend$/)
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(strip(page).locator(TAG)).toHaveText(
      sharedCopy.journeyStrip.amend
    )
    await expect(cancelAmendLink(page)).toHaveCount(0)
  })

  test('confirmation restores the submitted snapshot and shows its banner', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.confirmButton }).click()

    await expect(
      page.getByText(checkAnswersCopy.cancelAmend.successBody)
    ).toBeVisible()
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
    await expect(page.getByText('DiscardMe99', { exact: true })).toHaveCount(0)
    await expect(
      page.getByText(values.internalReferenceNumber, { exact: true })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  })

  test('confirmation page has no serious or critical axe violations', async ({
    page
  }) => {
    await expectAxeClean(page, 'Cancel amendment')
  })

  test('restored submitted review has no serious or critical axe violations', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.confirmButton }).click()
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible()

    await expectAxeClean(page, 'Read-only submitted check answers')
  })
})

test.describe('cancel-amend feature without JavaScript', () => {
  test('the status bar Cancel amend reaches the confirmation and Yes restores Submitted', async ({
    page,
    browser
  }) => {
    await signIn(page)
    const reference = await submitNotification(page)
    await page.goto(BASE)
    await page
      .getByRole('button', { name: `Amend notification ${reference}` })
      .click()
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState()
    })
    const noJs = await context.newPage()

    await noJs.goto(`${BASE}/notifications/${reference}/origin`)
    await cancelAmendLink(noJs).click()
    await expect(noJs).toHaveURL(/\/cancel-amend$/)
    await noJs.getByRole('button', { name: copy.confirmButton }).click()

    await expect(noJs).toHaveURL(/\/notification-view\?cancelled=1$/)
    await expect(strip(noJs).locator(TAG)).toHaveText(
      sharedCopy.journeyStrip.submitted
    )
    await context.close()
  })
})
