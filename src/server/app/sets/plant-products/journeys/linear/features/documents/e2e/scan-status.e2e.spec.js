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

test.describe('plant-products document scan lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await startAtDocuments(page)
  })

  test('blocks continue while a scan is pending and releases it once clean', async ({
    page
  }) => {
    await addDocument(page, {
      reference: 'PHYTO-CLEAN',
      file: pdfFile('phyto.pdf')
    })
    await expect(rowFor(page, 'PHYTO-CLEAN')).toContainText(
      copy.status.checking
    )

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL((url) => documentsUrl.test(url.pathname))
    await expect(page.getByRole('alert')).toContainText(
      copy.errors.cannotContinue
    )

    await settleScan(page, 'PHYTO-CLEAN', copy.status.safe)

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).not.toHaveURL((url) => documentsUrl.test(url.pathname))
  })

  test('names the infected file, keeps its bytes hidden and allows removal', async ({
    page
  }) => {
    const filename = 'virus.pdf'
    await addDocument(page, {
      reference: 'PHYTO-INFECTED',
      file: pdfFile(filename)
    })
    await settleScan(page, 'PHYTO-INFECTED', copy.status.virus)

    const alert = page.getByRole('alert')
    await expect(alert).toContainText(copy.errors.virus(filename))
    await alert.getByRole('link', { name: copy.errors.virus(filename) }).click()
    await expect(page.locator('#documents-added')).toBeFocused()

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL((url) => documentsUrl.test(url.pathname))

    await page
      .getByRole('button', {
        name: `${copy.actions.remove} Phytosanitary certificate PHYTO-INFECTED`
      })
      .click()
    await expect(rowFor(page, 'PHYTO-INFECTED')).toHaveCount(0)

    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).not.toHaveURL((url) => documentsUrl.test(url.pathname))
  })

  test('a row with no file is never presented as a scan verdict', async ({
    page
  }) => {
    await addDocument(page, { type: 'AIR_WAYBILL', reference: 'AIR-NOFILE' })

    const row = rowFor(page, 'AIR-NOFILE')
    await expect(row).toContainText(copy.status.noFile)
    await expect(row).not.toContainText(copy.status.safe)
    await expect(row).not.toContainText(copy.status.checking)
    await expect(
      page.getByRole('link', { name: copy.actions.refresh })
    ).toHaveCount(0)
  })
})
