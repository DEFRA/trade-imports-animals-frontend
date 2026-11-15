import { expect, test } from '@playwright/test'

import {
  addDocument,
  CARD_ERROR_SELECTOR,
  completeAnswerSections,
  documentCardFor,
  documentNamed,
  expectDraftReviewEndsWithContinue,
  STILL_SCANNING_DOCUMENT_FILE_NAME,
  errorSummary,
  expectNoSeriousOrCriticalViolations,
  journeyIdFromPage,
  journeyUrl,
  openFromOverviewRow,
  openNotificationView,
  openOverview,
  openReviewFromHub,
  postJourneyFormToDeclaration,
  signIn,
  startNotification,
  urlUnderBase,
  errorSummaryLinks,
  backLink
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
import { copy as documentsCopy } from '../documents/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const SUBMIT_BUTTON = 'form button[type="submit"]'
const EDITED_REFERENCE = 'CHANGED-IN-ANOTHER-TAB'
const REVIEW_URL = urlUnderBase('/notifications/[^/]+/notification-view')
const ORIGIN_URL = urlUnderBase('/notifications/[^/]+/origin')
const CHANGED_REVIEW_URL = urlUnderBase(
  '/notifications/[^/]+/notification-view\\?staleAction=1'
)

const REFUSED_REVIEW_URL = urlUnderBase(
  '/notifications/[^/]+/notification-view\\?refused=1'
)
const CONFIRMATION_URL = urlUnderBase('/notifications/[^/]+/confirmation')
const UNFINISHED_CARD_MESSAGES = [
  checkAnswersCopy.errors.cards.whatAreYouImporting,
  checkAnswersCopy.errors.cards.mainImportReason,
  checkAnswersCopy.errors.cards.commodityDetails,
  checkAnswersCopy.errors.cards.additionalDetails,
  checkAnswersCopy.errors.cards.arrivalDetails,
  checkAnswersCopy.errors.cards.transportDetails,
  checkAnswersCopy.errors.cards.addresses,
  checkAnswersCopy.errors.cards.contactAddress
]

const declareInAnotherTab = async (page) => {
  const other = await page.context().newPage()
  await other.goto(journeyUrl(page, 'notification-view'))
  await other
    .getByRole('button', { name: checkAnswersCopy.submit.button })
    .click()
  await other.getByRole('checkbox', { name: copy.declarationLabel }).check()
  await other.locator(SUBMIT_BUTTON).click()
  await expect(other).toHaveURL(CONFIRMATION_URL)
  await other.close()
}

const continueFromReview = async (page) => {
  await page
    .getByRole('button', { name: checkAnswersCopy.submit.button })
    .click()
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const startAtDeclaration = async (page) => {
  await startNotification(page)
  await completeAnswerSections(page)
  await openReviewFromHub(page)
  await continueFromReview(page)
}

const editInAnotherTab = async (page) => {
  const other = await page.context().newPage()
  await other.goto(journeyUrl(page, 'origin'))
  await other
    .getByLabel('Your internal reference for this consignment (optional)')
    .fill(EDITED_REFERENCE)
  await other.getByRole('button', { name: 'Save and continue' }).click()
  await expect(other).not.toHaveURL(ORIGIN_URL)
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

  test('puts the confirmation checkbox in a group named by the declaration legend', async ({
    page
  }) => {
    const group = page.getByRole('group', { name: copy.declarationLegend })

    await expect(
      group.getByRole('checkbox', { name: copy.declarationLabel })
    ).toBeVisible()
  })

  test('shows the date of declaration as the strong text of its line', async ({
    page
  }) => {
    const date = page
      .getByRole('paragraph')
      .filter({ hasText: copy.dateOfDeclaration })
      .getByRole('strong')

    await expect(date).toHaveText(/^\d{1,2} [A-Z][a-z]+ \d{4}$/)
  })

  test('starts the page with the heading', async ({ page }) => {
    const title = page.getByRole('heading', { level: 1, name: copy.title })
    await expect(title).toBeVisible()
    await expect(title.locator('xpath=preceding-sibling::*')).toHaveCount(0)
  })

  test('declaration validation: when unchecked, links to and focuses the clear checkbox', async ({
    page
  }) => {
    await page.locator(SUBMIT_BUTTON).click()

    const declarationError = errorSummaryLinks(
      page,
      copy.errors.declarationRequired
    )
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
    await expect(backLink(page)).toHaveAttribute(
      'href',
      new URL(journeyUrl(page, 'notification-view'), page.url()).pathname
    )

    await backLink(page).click()

    await expect(page).toHaveURL(REVIEW_URL)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Declaration')
  })

  test('submits a complete notification, redirects to confirmation and keeps the declaration', async ({
    page
  }) => {
    const declarationUrl = journeyUrl(page, 'declaration')

    await page.getByRole('checkbox', { name: copy.declarationLabel }).check()
    await page.locator(SUBMIT_BUTTON).click()

    await expect(page).toHaveURL(CONFIRMATION_URL)
    await page.goto(declarationUrl)
    await expect(page).toHaveURL(CONFIRMATION_URL)
  })

  test('refuses the submit and returns to the review when the notification changed after the declaration rendered', async ({
    page
  }) => {
    await editInAnotherTab(page)

    await page.getByRole('checkbox', { name: copy.declarationLabel }).check()
    await page.locator(SUBMIT_BUTTON).click()

    await expectChangedBanner(page)
    await expect(page.getByText(EDITED_REFERENCE)).toBeVisible()
    await expectDraftReviewEndsWithContinue(page)
  })

  test('shows the confirmation for the same notification when another tab submitted it first', async ({
    page
  }) => {
    const reference = journeyIdFromPage(page)
    await declareInAnotherTab(page)

    await page.getByRole('checkbox', { name: copy.declarationLabel }).check()
    await page.locator(SUBMIT_BUTTON).click()

    await expect(page).toHaveURL(CONFIRMATION_URL)
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
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

  test('sends a hand-crafted Continue from a browser that never opened the review back to the review', async ({
    page
  }) => {
    await startNotification(page)
    await completeAnswerSections(page)

    await page.goto(journeyUrl(page, 'origin'))
    await postJourneyFormToDeclaration(page, { step: 'review' })

    await expect(page).toHaveURL(REVIEW_URL)
    await expect(page.getByRole('heading', { name: copy.title })).toHaveCount(0)
  })

  test('refuses a declaration ticked on a document still being scanned, and shows the review as a draft naming that document', async ({
    page
  }) => {
    await startNotification(page)
    await completeAnswerSections(page)
    await openFromOverviewRow(page, hubCopy.rows.documents.title)
    await addDocument(
      page,
      documentNamed('SCAN-0001', STILL_SCANNING_DOCUMENT_FILE_NAME)
    )
    await openOverview(page)
    await openReviewFromHub(page)

    await postJourneyFormToDeclaration(page, {
      step: 'declare',
      declaration: 'confirmed'
    })

    await expect(page).toHaveURL(REFUSED_REVIEW_URL)
    await expect(
      errorSummaryLinks(page, documentsCopy.errors.someStillScanning, {
        exact: true
      })
    ).toBeVisible()
    await expect(
      documentCardFor(page, 1).locator(CARD_ERROR_SELECTOR)
    ).toContainText(documentsCopy.errors.someStillScanning)
    await expectDraftReviewEndsWithContinue(page)
  })

  test('refuses a declaration ticked on an incomplete notification, and shows the review as a draft naming each unfinished card', async ({
    page
  }) => {
    await startNotification(page)
    await openNotificationView(page)

    await postJourneyFormToDeclaration(page, {
      step: 'declare',
      declaration: 'confirmed'
    })

    await expect(page).toHaveURL(REFUSED_REVIEW_URL)
    await expect(errorSummary(page).getByRole('link')).toHaveText(
      UNFINISHED_CARD_MESSAGES
    )
    await expectDraftReviewEndsWithContinue(page)
  })

  test('refuses Continue and shows the current notification when it changed after the review rendered', async ({
    page
  }) => {
    await startNotification(page)
    await completeAnswerSections(page)
    await openReviewFromHub(page)

    await editInAnotherTab(page)
    await page
      .getByRole('button', { name: checkAnswersCopy.submit.button })
      .click()

    await expectChangedBanner(page)
    await expect(page.getByText(EDITED_REFERENCE)).toBeVisible()
  })
})
