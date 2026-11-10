import { expect, test } from '@playwright/test'
import {
  answerWhatYouAreImportingFromOverview,
  signIn,
  startNotification,
  openFromOverviewRow
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { copy as hubCopy } from '../../hub/copy/copy.en.js'

test.describe('upload documents entry', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('following the documents row from Overview opens the page titled "Upload documents" with only the origin answered', async ({
    page
  }) => {
    await startNotification(page)
    await page.getByRole('link', { name: hubCopy.rows.documents.title }).click()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })

  test('opening the page by its own address shows it titled "Upload documents" with only the origin and the species answered', async ({
    page
  }) => {
    await startNotification(page)
    await answerWhatYouAreImportingFromOverview(page)
    await openFromOverviewRow(page, hubCopy.rows.documents.title)
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })
})
