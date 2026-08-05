import { expect } from '@playwright/test'

import { journeyUrl, startNotification } from '../journey.e2e-helper.js'
import { copy } from './copy/copy.en.js'

export const documentsUrl =
  /^\/plant-products\/notifications\/[^/]+\/accompanying-documents$/

export const pdfFile = (name = 'phyto.pdf') => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 plant products test document')
})

export const startAtDocuments = async (page) => {
  await startNotification(page)
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await page.getByRole('link', { name: 'Commodity', exact: true }).click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Enter commodity code').fill('06011010')
  await page
    .locator('#commodity-code-search')
    .getByRole('button', { name: 'Search', exact: true })
    .click()
  await page.goto(journeyUrl(page, 'accompanying-documents'))
  await expect(page).toHaveURL((url) => documentsUrl.test(url.pathname))
}

export const addDocument = async (
  page,
  {
    type = 'PHYTOSANITARY_CERTIFICATE',
    reference = 'PHYTO-001',
    date = '4/12/2025',
    file
  } = {}
) => {
  await page.getByLabel(copy.labels.documentType).selectOption(type)
  await page.getByLabel(copy.labels.documentReference).fill(reference)
  await page.getByLabel(copy.labels.issueDate).fill(date)
  if (file) {
    await page.getByLabel(copy.labels.file).setInputFiles(file)
  }
  await page.getByRole('button', { name: copy.actions.addDocument }).click()
}

export const rowFor = (page, reference) =>
  page.getByRole('row').filter({ hasText: reference })

export const settleScan = async (page, reference, expectedStatus) => {
  await expect
    .poll(async () => {
      const refresh = page.getByRole('link', { name: copy.actions.refresh })
      if (await refresh.isVisible()) {
        await refresh.click()
      }
      return rowFor(page, reference).innerText()
    })
    .toContain(expectedStatus)
}
