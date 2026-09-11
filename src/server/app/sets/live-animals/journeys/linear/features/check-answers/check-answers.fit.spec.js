import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  chooseCountryOfOrigin,
  journeyUrl,
  signIn,
  startNotification
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const INTERNAL_REFERENCE_LABEL =
  'Your internal reference for this consignment (optional)'
const SAVE_AND_CONTINUE = 'Save and continue'
const NOTIFICATION_VIEW_SLUG = 'notification-view'

const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')

const openOrigin = (page) =>
  page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()

test.describe('check-answers feature summary rows', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders entered and missing answers in their summary rows', async ({
    page
  }) => {
    await startNotification(page)
    await openOrigin(page)
    await chooseCountryOfOrigin(page, 'France')
    await page.getByRole('radio', { name: 'Yes' }).check()
    // Five characters after the prefix — the joined code is eight, which the old whole-code cap made impossible.
    await page
      .getByLabel('Enter the region of origin code', { exact: true })
      .fill('IDF75')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: copy.sections.aboutTheConsignment
      })
    ).toBeVisible()
    await expect(rowFor(page, copy.rows.countryOfOrigin)).toContainText(
      'France'
    )
    await expect(rowFor(page, copy.rows.regionCodeRequired)).toContainText(
      copy.yesNo.yes
    )
    await expect(rowFor(page, copy.rows.regionCode)).toContainText('FR-IDF75')
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      'ReviewRef1'
    )
    await expect(rowFor(page, copy.rows.arrivalDate)).toContainText(
      copy.notProvided
    )
  })

  test('journey with only the entry page answered renders Not provided for the blank rows', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      copy.notProvided
    )
    await expect(rowFor(page, copy.rows.arrivalDate)).toContainText(
      copy.notProvided
    )
  })
})

test.describe('check-answers feature documents section', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  // Documents are optional, so a journey with none is the ordinary case. The
  // section has to stand anyway, or the review never mentions documents and
  // offers no route to the upload page.
  test('shows the documents section and a Change route with nothing uploaded', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      page.getByRole('heading', { name: copy.sections.documents })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.cards.documents })
    ).toBeVisible()
    await expect(page.getByText(copy.documentsEmpty)).toBeVisible()

    const changeLink = page.getByRole('link', {
      name: `${copy.change} ${copy.hidden.documents}`
    })
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/accompanying-documents\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/accompanying-documents\?change=1$/)
  })
})

// The reason for import asks up to three further questions as conditional
// reveals. Each answer has to read back on the review with a Change route to
// the page that collected it.
test.describe('check-answers feature exit answers', () => {
  const IMPORT_REASON_SLUG = 'import-reason'
  const EXIT_PORT_CODE = 'GB DVR'
  const EXIT_PORT_LABEL = 'Port of Dover (GB DVR)'
  const DESTINATION_COUNTRY_CODE = 'IE'
  const DESTINATION_COUNTRY_NAME = 'Ireland'

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the destination country and port of exit a transit collected, and changes them from the review', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, IMPORT_REASON_SLUG))
    await page.locator('input[name="reasonForImport"][value="transit"]').check()
    await page.locator('#transitPortOfExit').selectOption(EXIT_PORT_CODE)
    await page
      .locator('#transitDestinationCountry')
      .selectOption(DESTINATION_COUNTRY_CODE)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(rowFor(page, copy.rows.destinationCountry)).toContainText(
      DESTINATION_COUNTRY_NAME
    )
    await expect(rowFor(page, copy.rows.portOfExit)).toContainText(
      EXIT_PORT_LABEL
    )
    await expect(
      page.getByText(copy.rows.exitDate, { exact: true })
    ).toHaveCount(0)

    const changeLink = rowFor(page, copy.rows.destinationCountry).getByRole(
      'link',
      { name: `${copy.change} destination country` }
    )
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/import-reason\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/import-reason\?change=1$/)
  })

  test('shows the exit date and port of exit a temporary admission collected', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, IMPORT_REASON_SLUG))
    await page
      .locator(
        'input[name="reasonForImport"][value="temporaryAdmissionHorses"]'
      )
      .check()
    await page.locator('#temporaryAdmissionExitDate').fill('27/3/2026')
    await page
      .locator('#temporaryAdmissionPortOfExit')
      .selectOption(EXIT_PORT_CODE)
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(rowFor(page, copy.rows.exitDate)).toContainText('27/3/2026')
    await expect(rowFor(page, copy.rows.portOfExit)).toContainText(
      EXIT_PORT_LABEL
    )
    await expect(
      page.getByText(copy.rows.destinationCountry, { exact: true })
    ).toHaveCount(0)
  })

  test('leaves all three rows off the review for a reason that asks none of them', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, IMPORT_REASON_SLUG))
    await page.locator('input[name="reasonForImport"][value="reEntry"]').check()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    for (const label of [
      copy.rows.destinationCountry,
      copy.rows.exitDate,
      copy.rows.portOfExit
    ]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0)
    }
  })
})

test.describe('check-answers feature change links', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('Change link threads context and returns to the same review after saving', async ({
    page
  }) => {
    await startNotification(page)
    await openOrigin(page)
    await chooseCountryOfOrigin(page, 'France')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const changeLink = rowFor(page, copy.rows.internalReference).getByRole(
      'link',
      { name: `${copy.change} internal reference number` }
    )
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/origin\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/origin\?change=1$/)
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).clear()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/notification-view$/)
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      copy.notProvided
    )
  })
})

test.describe('check-answers feature navigation and submission', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('review has no serious or critical axe violations', async ({ page }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Check answers has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })

  // An address error belongs to a reference that no longer resolves, not to a
  // role nobody has reached yet. A new journey must read as unanswered.
  test('new journey shows no address error before a role has been answered', async ({
    page
  }) => {
    await startNotification(page)
    const hubUrl = journeyUrl(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(rowFor(page, copy.rows.consignor)).toContainText(
      copy.notProvided
    )
    await expect(
      page.getByRole('link', { name: copy.errors.parties.consignor })
    ).toBeHidden()

    await page.getByRole('button', { name: copy.submit.button }).click()

    // Continue is not refused, so it leaves the review page: the incomplete
    // journey sends it back to the hub rather than on to the declaration.
    await expect(page).toHaveURL(hubUrl)
  })
})
