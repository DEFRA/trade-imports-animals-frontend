import { expect, test } from '@playwright/test'

import { copy } from '../copy/copy.en.js'
import {
  addDocument,
  documentsUrl,
  pdfFile,
  rowFor,
  settleScan,
  startAtDocuments
} from '../documents.e2e-helper.js'
import {
  MAX_FILE_SIZE_BYTES,
  MAX_PAYLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE
} from '../upload-config.js'

test.use({ javaScriptEnabled: false })

test.describe('plant-products accompanying documents without JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await startAtDocuments(page)
  })

  test('uploads, refreshes the scan by link, then continues and removes', async ({
    page
  }) => {
    await addDocument(page, { file: pdfFile() })

    const row = rowFor(page, 'PHYTO-001')
    await expect(row).toContainText(copy.status.checking)
    await expect(
      page.getByRole('link', { name: copy.actions.refresh })
    ).toBeVisible()
    // The announcer ships on every render; with no script to fill it, it must
    // be an empty, silent element rather than anything the user meets.
    await expect(page.locator('#js-scan-status-announcer')).toBeEmpty()
    const timeoutHint = page.locator('#js-timeout-message')
    await expect(timeoutHint).toHaveCount(1)
    await expect(timeoutHint).toBeHidden()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('alert')).toContainText(
      copy.errors.cannotContinue
    )

    await settleScan(page, 'PHYTO-001', copy.status.safe)

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).not.toHaveURL((url) => documentsUrl.test(url.pathname))

    await page.goBack()
    await page
      .getByRole('button', {
        name: `${copy.actions.remove} Phytosanitary certificate PHYTO-001`
      })
      .click()
    await expect(rowFor(page, 'PHYTO-001')).toHaveCount(0)
  })

  test('adds a document with no file at all and continues straight away', async ({
    page
  }) => {
    await addDocument(page, { reference: 'PHYTO-NOFILE' })

    const row = rowFor(page, 'PHYTO-NOFILE')
    await expect(row).toContainText(copy.status.noFile)
    await expect(row).not.toContainText(copy.status.safe)

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).not.toHaveURL((url) => documentsUrl.test(url.pathname))
  })

  test('rejects a file over the size limit with a linked error, the client enhancement inert', async ({
    page
  }) => {
    // The client-side refusal ships on this very page. With no script to run
    // it, the server rule alone has to produce the rejection — it stays the
    // authoritative one, and this is the guard that says so.
    await expect(page.locator('form[data-max-file-size]')).toHaveAttribute(
      'data-max-file-size',
      String(MAX_FILE_SIZE_BYTES)
    )
    await expect(page.locator('form[data-max-file-size]')).toHaveAttribute(
      'data-oversize-error',
      OVERSIZE_FILE_MESSAGE
    )

    await page
      .getByLabel(copy.labels.documentType)
      .selectOption('PHYTOSANITARY_CERTIFICATE')
    await page.getByLabel(copy.labels.documentReference).fill('PHYTO-BIG')
    await page.getByLabel(copy.labels.issueDate).fill('4/12/2025')
    await page.getByLabel(copy.labels.file).setInputFiles({
      name: 'big.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(MAX_FILE_SIZE_BYTES + 1)
    })

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url() === page.url()
    )
    await page.getByRole('button', { name: copy.actions.addDocument }).click()
    const response = await responsePromise

    expect(response.status()).toBe(400)
    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: OVERSIZE_FILE_MESSAGE })
    await expect(summaryLink).toHaveAttribute('href', '#file')
    await expect(page.locator('.govuk-error-summary')).toHaveCount(1)
    await expect(page.locator('[data-client-error]')).toHaveCount(0)
    await expect(page.getByLabel(copy.labels.documentReference)).toHaveValue(
      'PHYTO-BIG'
    )
  })

  test('rewrites a route-level payload rejection into a linked error, never a bare 413', async ({
    page
  }) => {
    await page
      .getByLabel(copy.labels.documentType)
      .selectOption('PHYTOSANITARY_CERTIFICATE')
    await page.getByLabel(copy.labels.documentReference).fill('PHYTO-HUGE')
    await page.getByLabel(copy.labels.issueDate).fill('4/12/2025')
    await page.getByLabel(copy.labels.file).setInputFiles({
      name: 'huge.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(MAX_PAYLOAD_BYTES + 500_000)
    })

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url() === page.url()
    )
    await page.getByRole('button', { name: copy.actions.addDocument }).click()
    const response = await responsePromise

    expect(response.status()).toBe(400)
    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: OVERSIZE_FILE_MESSAGE })
    await expect(summaryLink).toHaveAttribute('href', '#file')
    await expect(page.getByLabel(copy.labels.file)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.actions.addDocument })
    ).toBeVisible()
  })
})

// A shipped bundle that fails to load is the realistic failure, not a user who
// turned JavaScript off. The manual path has to survive both.
test.describe('plant-products accompanying documents when the bundle fails to load', () => {
  test.use({ javaScriptEnabled: true })

  test.beforeEach(async ({ page }) => {
    await page.route('**/javascripts/plant-products-documents*', (route) =>
      route.abort()
    )
    await startAtDocuments(page)
  })

  test('keeps the manual refresh link usable all the way through', async ({
    page
  }) => {
    await addDocument(page, { file: pdfFile() })

    const row = rowFor(page, 'PHYTO-001')
    await expect(row).toContainText(copy.status.checking)

    const refresh = page.getByRole('link', { name: copy.actions.refresh })
    await expect(refresh).toBeVisible()
    await refresh.click()
    await expect(row).toContainText(copy.status.safe)
    await expect(
      row.getByRole('link', {
        name: `${copy.actions.viewFile} Phytosanitary certificate PHYTO-001`
      })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).not.toHaveURL((url) => documentsUrl.test(url.pathname))
  })
})
