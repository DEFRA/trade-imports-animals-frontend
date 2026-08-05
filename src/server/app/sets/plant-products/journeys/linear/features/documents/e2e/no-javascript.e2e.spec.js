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

  test('rejects a file over the size limit with a linked error', async ({
    page
  }) => {
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
