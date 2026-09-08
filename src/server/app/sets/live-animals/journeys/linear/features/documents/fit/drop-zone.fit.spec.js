import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  signIn,
  startNotification,
  unlockSections
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const DROPPED_FILENAME = 'dropped-itahc.pdf'
const CHOSEN_FILENAME = 'chosen-itahc.pdf'

const dropZone = (page) => page.locator('.govuk-file-upload-wrapper')

const dropZoneButton = (page) =>
  page.getByRole('button', { name: copy.file.label })

const chosenFileStatus = (page) =>
  page.locator('.govuk-file-upload-button__status')

// The status line only exists once the page's bundle has enhanced the input,
// so waiting for it is what tells the test the drop zone is listening.
const openDocuments = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: 'Uploaded documents' }).click()
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  await expect(chosenFileStatus(page)).toHaveText(copy.file.noFileChosen)
}

const fileInput = (page) => page.locator('input[type="file"]')

const chooseFile = (page, filename) =>
  fileInput(page).setInputFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 drop zone test')
  })

// The only way to prove a drop target: hand the button a real DataTransfer
// carrying a file, the way a browser does when a trader lets go of one.
const dropFile = async (page, filename) => {
  const dataTransfer = await page.evaluateHandle((name) => {
    const transfer = new DataTransfer()
    transfer.items.add(
      new File(['%PDF-1.4 dropped'], name, { type: 'application/pdf' })
    )
    return transfer
  }, filename)
  await dropZoneButton(page).dispatchEvent('drop', { dataTransfer })
}

test.describe('document upload drop zone', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('offers a drop zone with the service’s own choose-file button and drop instruction', async ({
    page
  }) => {
    await expect(dropZone(page)).toBeVisible()
    const chooseFileButton = dropZoneButton(page)
    await expect(chooseFileButton).toBeVisible()
    await expect(chooseFileButton).toContainText(copy.file.chooseButton)
    await expect(chooseFileButton).toContainText(copy.file.dropInstruction)
  })

  test('says no file is chosen, in a live region, until one is', async ({
    page
  }) => {
    const status = chosenFileStatus(page)
    await expect(status).toHaveText(copy.file.noFileChosen)
    await expect(status).toHaveAttribute('aria-live', 'polite')

    await chooseFile(page, CHOSEN_FILENAME)

    await expect(status).toHaveText(CHOSEN_FILENAME)
  })

  test('takes a file dropped onto the zone and names it', async ({ page }) => {
    await dropFile(page, DROPPED_FILENAME)

    await expect(chosenFileStatus(page)).toHaveText(DROPPED_FILENAME)
    // The file has to reach the input, not just the status line — that is what
    // the form posts.
    await expect
      .poll(() =>
        fileInput(page).evaluate((input) => input.files[0]?.name ?? null)
      )
      .toBe(DROPPED_FILENAME)
  })

  // The enhancement must not duplicate the input or change the field the form
  // posts. This runs with JavaScript on, so it does not exercise the no-JS
  // fallback itself — that coverage is an open question on inc-137.
  test('enhancement leaves a single file input named file behind the zone', async ({
    page
  }) => {
    await expect(fileInput(page)).toHaveCount(1)
    await expect(fileInput(page)).toHaveAttribute('name', 'file')
  })

  test('draws the failed attachment on the zone itself', async ({ page }) => {
    await page.getByRole('button', { name: copy.addAnother }).click()

    await expect(page.locator('#file-error')).toContainText(
      copy.errors.fileRequired
    )
    // The red border is the form group's error state reaching the drop zone,
    // so the failure is drawn on the control the trader has to go back to.
    await expect(
      page.locator('.govuk-form-group--error .govuk-file-upload-wrapper')
    ).toHaveCount(1)
    await expect(dropZoneButton(page)).toHaveAccessibleDescription(
      new RegExp(copy.errors.fileRequired)
    )
  })

  test('the chosen-file drop zone has no serious or critical axe violations', async ({
    page
  }) => {
    await chooseFile(page, CHOSEN_FILENAME)
    await expect(chosenFileStatus(page)).toHaveText(CHOSEN_FILENAME)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Document upload drop zone has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
