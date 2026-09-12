import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  chooseCountryOfOrigin,
  completeAnswerSections,
  journeyIdFromPage,
  journeyUrl,
  signIn,
  startNotification
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const INTERNAL_REFERENCE_LABEL =
  'Your internal reference for this consignment (optional)'
const SAVE_AND_CONTINUE = 'Save and continue'
const NOTIFICATION_VIEW_SLUG = 'notification-view'
const ARRIVAL_DETAILS_ANCHOR = '#arrival-details'

const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')

/** The one Change link a card carries in its heading, named the way a screen
 * reader reads it — "Change import details". */
const cardChangeLink = (page, hiddenText) =>
  page.getByRole('link', { name: `${copy.change} ${hiddenText}` })

const expectNoSeriousOrCriticalAxeViolations = async (page, pageName) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${pageName} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

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

    const changeLink = cardChangeLink(page, copy.hidden.cards.documents)
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

  test('shows the destination country and port of exit a transit collected, with the one Change link in the card heading', async ({
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

    // The exit answers sit in the Additional animal details card, and that card
    // — not the row — carries the one Change link. That link opens the
    // additional-details page, which does not collect these two answers: the
    // destination country and the port of exit come from the reason-for-import
    // page, so they cannot be changed from the review at all. Tracked as an
    // open question on inc-146.
    await expect(
      rowFor(page, copy.rows.destinationCountry).getByRole('link')
    ).toHaveCount(0)

    const changeLink = cardChangeLink(
      page,
      copy.hidden.cards.additionalAnimalDetails
    )
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/additional-details\?change=1$/
    )
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

    const changeLink = cardChangeLink(page, copy.hidden.cards.importDetails)
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

  // Design release 1 puts one Change link in each card's heading bar and none
  // on a row, so the trader meets one link per card rather than one per answer.
  test('every Change link sits in a card heading and no summary row carries one', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    const cards = page.locator('.govuk-summary-card')
    const cardCount = await cards.count()

    expect(cardCount).toBeGreaterThan(0)
    await expect(page.getByRole('link', { name: copy.change })).toHaveCount(
      cardCount
    )
    await expect(page.locator('.govuk-summary-list__actions')).toHaveCount(0)

    for (let index = 0; index < cardCount; index += 1) {
      await expect(
        cards.nth(index).locator('.govuk-summary-card__actions a')
      ).toHaveCount(1)
    }
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

    await expectNoSeriousOrCriticalAxeViolations(page, 'Check answers')
  })

  // An address error belongs to a reference that no longer resolves, not to a
  // role nobody has reached yet. A new journey must read as unanswered.
  test('new journey shows no address error before a role has been answered', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(rowFor(page, copy.rows.consignor)).toContainText(
      copy.notProvided
    )
    await expect(
      page.getByRole('link', { name: copy.errors.parties.consignor })
    ).toBeHidden()
  })
})

// Design release 1 heads the review page of an unfinished notification with
// "There is a problem", names each unfinished card, marks the card itself, and
// refuses to go on until the notification is complete.
test.describe('check-answers feature unfinished notification', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('names every unfinished card and marks the card it names', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))

    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
    const entry = page.getByRole('link', {
      name: copy.errors.cards.arrivalDetails
    })
    await expect(entry).toHaveAttribute('href', ARRIVAL_DETAILS_ANCHOR)
    await expect(
      page
        .locator(ARRIVAL_DETAILS_ANCHOR)
        .getByText(copy.errors.cards.arrivalDetails)
    ).toBeVisible()
    await expect(page.locator(ARRIVAL_DETAILS_ANCHOR)).toHaveClass(
      /app-summary-card--error/
    )
    await expect(
      page.locator(`${ARRIVAL_DETAILS_ANCHOR} .govuk-error-message`)
    ).toContainText(copy.errors.prefix)
  })

  test('refuses Continue and keeps the trader on the review page', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = journeyUrl(page, NOTIFICATION_VIEW_SLUG)
    await page.goto(reviewUrl)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(reviewUrl)
    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
  })

  test('unfinished review has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto(journeyUrl(page, NOTIFICATION_VIEW_SLUG))
    await page.getByRole('button', { name: copy.submit.button }).click()

    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Unfinished check answers'
    )
  })
})

// Design release 1 renders no form on the review page once a notification is
// submitted: the read-only review is a record of what was sent, ending with the
// last card. It must not still invite the trader to submit a notification that
// is already submitted.
test.describe('check-answers feature submitted notification', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotification(page)
    await completeAnswerSections(page)
    await page.getByRole('link', { name: 'Check and submit' }).click()
    await page.getByRole('button', { name: copy.submit.button }).click()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    const reference = journeyIdFromPage(page)
    await page.goto('/')
    await page
      .getByRole('link', {
        name: `View ${dashboardCopy.actionHidden(reference)}`
      })
      .click()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })

  test('ends with the last card and offers no way to submit again', async ({
    page
  }) => {
    await expect(
      page.getByRole('button', {
        name: sharedCopy.notificationActions.copy.text
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.submit.heading })
    ).toHaveCount(0)
    await expect(page.getByText(copy.submit.body)).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.submit.button })
    ).toHaveCount(0)
  })

  test('submitted review has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalAxeViolations(
      page,
      'Submitted check answers'
    )
  })
})
