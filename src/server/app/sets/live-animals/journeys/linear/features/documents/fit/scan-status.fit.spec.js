import { expect, test } from '@playwright/test'

import {
  signIn,
  startNotification,
  unlockSections
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { SCAN_STATUS } from '../scan-poll.js'

const openDocuments = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: 'Uploaded documents' }).click()
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const rowFor = (page, reference) =>
  page.locator('.govuk-table__row', { hasText: reference })

const errorSummaryLink = (page, name) =>
  page.locator('.govuk-error-summary').getByRole('link', { name })

// The enhanced upload hides the input behind a drop-zone button, so the file
// goes to the input itself rather than to the labelled control.
const fileInput = (page) => page.locator('input[type="file"]')

const DATE_OF_ISSUE = { day: '3', month: '1', year: '2026' }

const documentNamed = (reference, filename) => ({
  accompanyingDocumentReference: reference,
  accompanyingDocumentType: 'ITAHC',
  accompanyingDocumentDateOfIssue: DATE_OF_ISSUE,
  filename
})

const uploadDocument = async (page, document) => {
  const issued = document.accompanyingDocumentDateOfIssue
  await page
    .getByLabel(copy.reference.label)
    .fill(document.accompanyingDocumentReference)
  await page
    .getByLabel(copy.documentType.label)
    .selectOption(document.accompanyingDocumentType)
  await page
    .getByLabel(copy.dateOfIssue.label)
    .fill(`${issued.day}/${issued.month}/${issued.year}`)
  await fileInput(page).setInputFiles({
    name: document.filename,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 scan status test')
  })
  await page.getByRole('button', { name: copy.addAnother }).click()
}

test.describe('document scan-status rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('blocks continue while the scan runs, then renders Check completed and allows the journey to continue', async ({
    page
  }) => {
    test.slow()
    const document = documentNamed('SCAN-SAFE-0001', 'itahc-scan.pdf')
    await uploadDocument(page, document)
    const row = rowFor(page, document.accompanyingDocumentReference)
    const statusCell = row.locator('[data-upload-id]')
    await expect(statusCell).toHaveAttribute(
      'data-scan-status',
      SCAN_STATUS.PENDING
    )
    await expect(row).toContainText(copy.scanTags.scanning)
    // The hidden label sits outside the tag the client rewrites, so it names
    // the document for the pending state and for the settled one after it.
    await expect(statusCell).toContainText(
      copy.scanStatusHidden(document.accompanyingDocumentReference)
    )

    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndContinue,
        exact: true
      })
      .click()
    await expect(
      errorSummaryLink(page, copy.errors.cannotContinue)
    ).toBeVisible()

    await expect(row).toContainText(copy.scanTags.complete)
    await expect(statusCell).toHaveAttribute(
      'data-scan-status',
      SCAN_STATUS.COMPLETE
    )
    await expect(statusCell).toContainText(
      copy.scanStatusHidden(document.accompanyingDocumentReference)
    )
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndContinue,
        exact: true
      })
      .click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('renders Virus found and its per-file error until the document is removed', async ({
    page
  }) => {
    test.slow()
    const document = documentNamed('SCAN-VIRUS-0001', 'virus-invoice.pdf')
    await uploadDocument(page, document)
    const row = rowFor(page, document.accompanyingDocumentReference)
    await expect(row).toContainText(copy.scanTags.scanning)
    await expect(row).toContainText(copy.scanTags.virusFound)
    await expect(
      errorSummaryLink(page, copy.errors.virusFound(document.filename))
    ).toBeVisible()
    await expect(row.getByRole('link', { name: copy.viewFile })).toHaveCount(0)

    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndContinue,
        exact: true
      })
      .click()
    await expect(
      errorSummaryLink(page, copy.errors.virusFound(document.filename))
    ).toBeVisible()
    await row
      .getByRole('button', {
        name: `${copy.remove} ${copy.removeHidden(1)}`,
        exact: true
      })
      .click()
    await expect(row).toHaveCount(0)
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndContinue,
        exact: true
      })
      .click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })
})

test.describe('document scan-status polling', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('updates one settled row in place, announces it and leaves a still-pending row alone', async ({
    page
  }) => {
    test.slow()
    const settling = documentNamed('POLL-SETTLES-0001', 'itahc-poll.pdf')
    const stuck = documentNamed('POLL-STUCK-0002', 'never-scans-invoice.pdf')
    await uploadDocument(page, settling)
    await uploadDocument(page, stuck)

    const settlingRow = rowFor(page, settling.accompanyingDocumentReference)
    const stuckRow = rowFor(page, stuck.accompanyingDocumentReference)
    await expect(settlingRow).toContainText(copy.scanTags.scanning)
    await expect(settlingRow).toContainText(copy.scanTags.complete)
    await expect(stuckRow).toContainText(copy.scanTags.scanning)
    await expect(
      settlingRow.getByRole('link', {
        name: `${copy.viewFile} ${copy.viewFileHidden(1)}`
      })
    ).toBeVisible()
    await expect(page.locator('#js-scan-status-announcer')).toHaveText(
      copy.announce.safe
    )
  })
})
