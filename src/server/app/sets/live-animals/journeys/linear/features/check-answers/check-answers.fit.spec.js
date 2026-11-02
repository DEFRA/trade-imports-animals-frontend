import { expect, test } from '@playwright/test'
import {
  BASE,
  DESKTOP_VIEWPORT,
  PHONE_VIEWPORT,
  chooseTypeAheadOption,
  chooseCountryOfOrigin,
  completeAnswerSections,
  expectNoSeriousOrCriticalViolations,
  journeyIdFromPage,
  journeyUrl,
  notificationViewUrl,
  openNotificationView,
  openReviewFromHub,
  signIn,
  startNotification,
  urlUnderBase
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as importReasonCopy } from '../import-reason/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const INTERNAL_REFERENCE_LABEL =
  'Your internal reference for this consignment (optional)'
const SAVE_AND_CONTINUE = 'Save and continue'
const ARRIVAL_DETAILS_ANCHOR = '#arrival-details'
const ARRIVAL_DETAILS_ROW_LABELS = [
  copy.rows.portOfEntry,
  copy.rows.arrivalDate,
  copy.rows.meansOfTransport,
  copy.rows.transportIdentification,
  copy.rows.transportDocumentReference
]

const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')

const answerCellFor = (page, label) =>
  rowFor(page, label).getByRole('definition')

const expectOnlyHiddenMissing = async (answerCell) => {
  await expect(answerCell).toHaveText(copy.missing)
  await expect(answerCell.locator('xpath=./*')).toHaveClass(
    'govuk-visually-hidden'
  )
}

const cardChangeLink = (page, hiddenText) =>
  page.getByRole('link', { name: `${copy.change} ${hiddenText}` })

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
    await page
      .getByLabel('Enter the region of origin code', { exact: true })
      .fill('IDF75')
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).fill('ReviewRef1')
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await openNotificationView(page)

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
    await expectOnlyHiddenMissing(answerCellFor(page, copy.rows.arrivalDate))
  })

  test('journey with only the entry page answered writes the settled blanks out and leaves the outstanding ones blank with a hidden Missing', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      copy.notApplicable
    )
    await expectOnlyHiddenMissing(answerCellFor(page, copy.rows.arrivalDate))
    await expect(rowFor(page, copy.rows.arrivalDate)).not.toContainText(
      copy.notApplicable
    )
  })
})

test.describe('check-answers feature section structure', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('numbers the six sections in order', async ({ page }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(
      page.getByRole('heading', { level: 2 }).filter({ hasText: /^\d\.\s/ })
    ).toHaveText([
      copy.sections.aboutTheConsignment,
      copy.sections.descriptionOfTheGoods,
      copy.sections.transportAndArrival,
      copy.sections.documents,
      copy.sections.consignmentParties,
      copy.sections.contactAddress
    ])
  })

  test('ends with the Continue button and nothing above it', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 }).last()
    ).toHaveText(copy.sections.contactAddress)

    const lastBlock = page.locator('.govuk-grid-column-two-thirds > *').last()
    await expect(lastBlock).toHaveJSProperty('tagName', 'FORM')

    await expect(
      lastBlock.locator('xpath=preceding-sibling::*[1]')
    ).toHaveClass(/govuk-summary-card/)

    await expect(
      lastBlock.getByRole('button', { name: copy.submit.button })
    ).toBeVisible()
  })

  test('heads every card with its own subsection heading', async ({ page }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expect(page.getByRole('heading', { level: 3 })).toHaveText([
      copy.groups.whereFrom,
      copy.groups.mainImportReason,
      copy.groups.additionalDetails,
      copy.groups.arrivalDetails,
      copy.groups.transportDetails,
      copy.groups.uploadDocuments,
      copy.groups.rolesAndAddresses,
      copy.groups.contactAddress
    ])
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(
      await page.locator('.govuk-summary-card').count()
    )
  })
})

test.describe('check-answers feature documents section', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the documents section and a Change route with nothing uploaded', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

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

test.describe('check-answers feature exit answers', () => {
  const IMPORT_REASON_SLUG = 'import-reason'
  const EXIT_PORT_CODE = 'GB DVR'
  const EXIT_PORT_LABEL = 'Port of Dover - GB DVR'
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
    await chooseTypeAheadOption(page, {
      label: importReasonCopy.port.label,
      inputId: 'transitPortOfExit',
      query: EXIT_PORT_CODE,
      optionName: EXIT_PORT_LABEL
    })
    await chooseTypeAheadOption(page, {
      label: importReasonCopy.country.label,
      inputId: 'transitDestinationCountry',
      query: DESTINATION_COUNTRY_NAME,
      optionName: DESTINATION_COUNTRY_NAME
    })
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await openNotificationView(page)

    await expect(rowFor(page, copy.rows.destinationCountry)).toContainText(
      DESTINATION_COUNTRY_NAME
    )
    await expect(rowFor(page, copy.rows.portOfExit)).toContainText(
      EXIT_PORT_LABEL
    )
    await expect(
      page.getByText(copy.rows.exitDate, { exact: true })
    ).toHaveCount(0)

    await expect(
      rowFor(page, copy.rows.destinationCountry).getByRole('link')
    ).toHaveCount(0)

    const changeLink = cardChangeLink(page, copy.hidden.cards.reasonForImport)
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
    await chooseTypeAheadOption(page, {
      label: importReasonCopy.port.label,
      inputId: 'temporaryAdmissionPortOfExit',
      query: EXIT_PORT_CODE,
      optionName: EXIT_PORT_LABEL
    })
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await openNotificationView(page)

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

    await openNotificationView(page)

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
    await openNotificationView(page)

    const changeLink = cardChangeLink(page, copy.hidden.cards.importDetails)
    await expect(changeLink).toHaveAttribute(
      'href',
      /\/notifications\/[^/]+\/origin\?change=1$/
    )

    await changeLink.click()

    await expect(page).toHaveURL(/\/origin\?change=1$/)
    await page.getByLabel(INTERNAL_REFERENCE_LABEL).clear()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/notification-view')
    )
    await expect(rowFor(page, copy.rows.internalReference)).toContainText(
      copy.notApplicable
    )
  })

  test('every Change link sits in a card heading and no summary row carries one', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

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
    await openNotificationView(page)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('review has no serious or critical axe violations', async ({ page }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expectNoSeriousOrCriticalViolations(page, 'Check answers')
  })

  test('new journey shows no address error before a role has been answered', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await expectOnlyHiddenMissing(answerCellFor(page, copy.rows.consignor))
    await expect(
      page.getByRole('link', { name: copy.errors.parties.consignor })
    ).toBeHidden()
  })
})

test.describe('check-answers feature unfinished notification', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('leaves every blank answer of an unfinished card blank with a hidden Missing', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    const card = page.locator(ARRIVAL_DETAILS_ANCHOR)

    await expect(card.getByText(copy.notApplicable)).toHaveCount(0)
    for (const label of ARRIVAL_DETAILS_ROW_LABELS) {
      await expectOnlyHiddenMissing(answerCellFor(page, label))
    }
  })

  test('shows the unfinished card with its Complete line and leaves the blank answer with a hidden Missing after a refused Continue at desktop and phone width', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = notificationViewUrl(page)
    await page.goto(reviewUrl)
    await page.getByRole('button', { name: copy.submit.button }).click()
    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)

    for (const viewport of [DESKTOP_VIEWPORT, PHONE_VIEWPORT]) {
      await page.setViewportSize(viewport)
      await expect(
        page
          .locator(`${ARRIVAL_DETAILS_ANCHOR} .govuk-error-message`)
          .getByText(copy.errors.cards.arrivalDetails)
      ).toBeVisible()
      await expectOnlyHiddenMissing(answerCellFor(page, copy.rows.arrivalDate))
    }
  })

  test('names every unfinished card in the error summary and shows its error message on the card', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

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
    await expect(
      page.locator(`${ARRIVAL_DETAILS_ANCHOR} .govuk-error-message`)
    ).toContainText(copy.errors.prefix)
  })

  test('refuses Continue and keeps the trader on the review page', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = notificationViewUrl(page)
    await page.goto(reviewUrl)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)
    await expect(
      page.getByRole('heading', { name: sharedCopy.errorSummary.title })
    ).toBeVisible()
  })

  test('refuses submit of a notification with no commodity line and names the missing species details', async ({
    page
  }) => {
    await startNotification(page)
    const reviewUrl = notificationViewUrl(page)
    await page.goto(reviewUrl)

    await page.getByRole('button', { name: copy.submit.button }).click()

    await expect(page).toHaveURL(`${reviewUrl}?refused=1`)
    const speciesEntry = page.getByRole('link', {
      name: copy.errors.cards.species
    })
    await expect(speciesEntry).toBeVisible()
    await expect(speciesEntry).toHaveAttribute(
      'href',
      '#description-of-the-goods'
    )
  })

  test('unfinished review has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)
    await page.getByRole('button', { name: copy.submit.button }).click()

    await expectNoSeriousOrCriticalViolations(page, 'Unfinished check answers')
  })
})

test.describe('check-answers feature submitted notification', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotification(page)
    await completeAnswerSections(page)
    await openReviewFromHub(page)
    await page.getByRole('button', { name: copy.submit.button }).click()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    const reference = journeyIdFromPage(page)
    await page.goto(BASE)
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
      page.getByRole('button', { name: copy.submit.button })
    ).toHaveCount(0)
  })

  test('submitted review has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Submitted check answers')
  })
})
