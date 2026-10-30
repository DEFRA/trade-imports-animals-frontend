import { expect, test } from '@playwright/test'

import {
  addDocument,
  documentRowFor,
  expectNoSeriousOrCriticalViolations,
  expectOverview,
  expectStackedOnSameRightEdge,
  openDocuments,
  PHONE_VIEWPORT,
  saveAndContinue,
  signIn,
  visitOverviewThenOpen
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { documentsPage } from '../page.js'
import { SCAN_STATUS } from '../scan-poll.js'

const errorSummaryLink = (page, name) =>
  page.locator('.govuk-error-summary').getByRole('link', { name })

const DATE_OF_ISSUE = { day: '3', month: '1', year: '2026' }

const documentNamed = (reference, filename) => ({
  accompanyingDocumentReference: reference,
  accompanyingDocumentType: 'ITAHC',
  accompanyingDocumentDateOfIssue: DATE_OF_ISSUE,
  filename
})

test.describe('document scan-status rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('a document still being scanned does not hold Save and continue, and settles when the trader comes back', async ({
    page
  }) => {
    test.slow()
    const document = documentNamed('SCAN-SAFE-0001', 'itahc-scan.pdf')
    await addDocument(page, document)
    const row = documentRowFor(page, document.accompanyingDocumentReference)
    const statusCell = row.locator('[data-upload-id]')
    await expect(statusCell).toHaveAttribute(
      'data-scan-status',
      SCAN_STATUS.PENDING
    )
    await expect(row).toContainText(copy.scanTags.scanning)
    await expect(statusCell).toContainText(
      copy.scanStatusHidden(document.accompanyingDocumentReference)
    )

    await saveAndContinue(page).click()
    await expectOverview(page)

    await visitOverviewThenOpen(page, documentsPage.slug)
    const reopenedRow = documentRowFor(
      page,
      document.accompanyingDocumentReference
    )
    const reopenedStatusCell = reopenedRow.locator('[data-upload-id]')
    await expect(reopenedRow).toContainText(copy.scanTags.complete)
    await expect(reopenedStatusCell).toHaveAttribute(
      'data-scan-status',
      SCAN_STATUS.COMPLETE
    )
    await expect(reopenedStatusCell).toContainText(
      copy.scanStatusHidden(document.accompanyingDocumentReference)
    )
    await expect(
      reopenedRow.getByRole('link', {
        name: `${copy.viewFile} ${copy.viewFileHidden(1)}`
      })
    ).toBeVisible()
  })

  test('names the virus a rejected document was refused for, until it is removed', async ({
    page
  }) => {
    test.slow()
    const document = documentNamed('SCAN-VIRUS-0001', 'virus-invoice.pdf')
    await addDocument(page, document)
    const row = documentRowFor(page, document.accompanyingDocumentReference)
    await expect(row).toContainText(copy.scanTags.scanning)
    await expect(row).toContainText(copy.scanTags.virusFound)
    await expect(
      errorSummaryLink(page, copy.errors.rejected(document.filename))
    ).toBeVisible()
    await expect(row.getByRole('link', { name: copy.viewFile })).toHaveCount(0)

    await saveAndContinue(page).click()
    await expect(
      errorSummaryLink(page, copy.errors.rejected(document.filename))
    ).toBeVisible()
    await row
      .getByRole('button', {
        name: `${copy.remove} ${copy.removeHidden(1)}`,
        exact: true
      })
      .click()
    await expect(row).toHaveCount(0)
    await saveAndContinue(page).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('the settled scan-status table has no serious or critical axe violations', async ({
    page
  }) => {
    test.slow()
    const document = documentNamed('SCAN-AXE-0001', 'itahc-axe.pdf')
    await addDocument(page, document)
    await expect(
      documentRowFor(page, document.accompanyingDocumentReference)
    ).toContainText(copy.scanTags.complete)

    await expectNoSeriousOrCriticalViolations(page, 'Documents, scan complete')
  })
})

test.describe('document scan-status polling', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('updates one settled row in place, announces it, leaves a still-pending row alone and lines up the actions it rebuilds', async ({
    page
  }) => {
    test.slow()
    const settling = documentNamed('POLL-SETTLES-0001', 'itahc-poll.pdf')
    const stuck = documentNamed('POLL-STUCK-0002', 'never-scans-invoice.pdf')
    await addDocument(page, settling)
    await addDocument(page, stuck)

    const settlingRow = documentRowFor(
      page,
      settling.accompanyingDocumentReference
    )
    const stuckRow = documentRowFor(page, stuck.accompanyingDocumentReference)
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

    await page.setViewportSize(PHONE_VIEWPORT)
    const settledActions = settlingRow.getByRole('cell').last()
    await expectStackedOnSameRightEdge(
      settledActions.getByRole('link', { name: copy.viewFile }),
      settledActions.getByRole('button', { name: copy.remove }),
      'View file and Remove on a row the client rebuilt'
    )
  })
})
