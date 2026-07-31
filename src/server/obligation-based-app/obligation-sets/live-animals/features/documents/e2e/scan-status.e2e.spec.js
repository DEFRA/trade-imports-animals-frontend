import { expect, test } from '@playwright/test'

import {
  startNotification,
  unlockSections
} from '../../../../../../../../e2e/live-animals-journey.js'
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

const uploadDocument = async (page, document) => {
  const issued = document.accompanyingDocumentDateOfIssue
  await page
    .getByLabel(copy.reference.label)
    .fill(document.accompanyingDocumentReference)
  await page
    .getByLabel(copy.dateOfIssue.label)
    .fill(`${issued.day}/${issued.month}/${issued.year}`)
  await page.getByLabel(copy.file.label).setInputFiles({
    name: document.filename,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 scan status test')
  })
  await page.getByRole('button', { name: copy.addAnother }).click()
}

test.describe('document scan-status rendering', () => {
  test.beforeEach(async ({ page }) => {
    await openDocuments(page)
  })

  test('blocks continue while checking, then renders Safe and allows the journey to continue', async ({
    page
  }) => {
    test.slow()
    const document = {
      accompanyingDocumentReference: 'SCAN-SAFE-0001',
      accompanyingDocumentDateOfIssue: {
        day: '3',
        month: '1',
        year: '2026'
      },
      filename: 'itahc-scan.pdf'
    }
    await uploadDocument(page, document)
    const row = rowFor(page, document.accompanyingDocumentReference)
    const statusCell = row.locator('[data-upload-id]')
    await expect(statusCell).toHaveAttribute(
      'data-scan-status',
      SCAN_STATUS.PENDING
    )
    await expect(row).toContainText(copy.scanTags.checking)

    await page.getByRole('button', { name: copy.continueButton }).click()
    await expect(
      page.locator('.govuk-error-summary').getByRole('link', {
        name: copy.errors.cannotContinue
      })
    ).toBeVisible()

    await expect(row).toContainText(copy.scanTags.safe)
    await expect(statusCell).toHaveAttribute(
      'data-scan-status',
      SCAN_STATUS.COMPLETE
    )
    await page.getByRole('button', { name: copy.continueButton }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('renders Virus found and its per-file error until the document is removed', async ({
    page
  }) => {
    test.slow()
    const document = {
      accompanyingDocumentReference: 'SCAN-VIRUS-0001',
      accompanyingDocumentDateOfIssue: {
        day: '3',
        month: '1',
        year: '2026'
      },
      filename: 'virus-invoice.pdf'
    }
    await uploadDocument(page, document)
    const row = rowFor(page, document.accompanyingDocumentReference)
    await expect(row).toContainText(copy.scanTags.checking)
    await expect(row).toContainText(copy.scanTags.virusFound)
    await expect(
      page.locator('.govuk-error-summary').getByRole('link', {
        name: copy.errors.virusFound(document.filename)
      })
    ).toBeVisible()
    await expect(row.getByRole('link', { name: copy.viewFile })).toHaveCount(0)

    await page.getByRole('button', { name: copy.continueButton }).click()
    await expect(
      page.locator('.govuk-error-summary').getByRole('link', {
        name: copy.errors.virusFound(document.filename)
      })
    ).toBeVisible()
    await row
      .getByRole('button', {
        name: `${copy.remove} ${copy.removeHidden(1)}`,
        exact: true
      })
      .click()
    await expect(row).toHaveCount(0)
    await page.getByRole('button', { name: copy.continueButton }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('updates one settled row in place, announces it and leaves a still-pending row alone', async ({
    page
  }) => {
    test.slow()
    const settling = {
      accompanyingDocumentReference: 'POLL-SETTLES-0001',
      accompanyingDocumentDateOfIssue: {
        day: '3',
        month: '1',
        year: '2026'
      },
      filename: 'itahc-poll.pdf'
    }
    const stuck = {
      accompanyingDocumentReference: 'POLL-STUCK-0002',
      accompanyingDocumentDateOfIssue: {
        day: '3',
        month: '1',
        year: '2026'
      },
      filename: 'never-scans-invoice.pdf'
    }
    await uploadDocument(page, settling)
    await uploadDocument(page, stuck)

    const settlingRow = rowFor(page, settling.accompanyingDocumentReference)
    const stuckRow = rowFor(page, stuck.accompanyingDocumentReference)
    await expect(settlingRow).toContainText(copy.scanTags.checking)
    await expect(settlingRow).toContainText(copy.scanTags.safe)
    await expect(stuckRow).toContainText(copy.scanTags.checking)
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
