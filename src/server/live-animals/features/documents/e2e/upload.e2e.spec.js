import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  addDocument,
  startNotification,
  unlockSections,
  values
} from '../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_FILE_TYPES_HINT,
  FILE_TYPE_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  OVERSIZE_FILE_MESSAGE
} from '../upload-config.js'

const openDocuments = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: 'Uploaded documents' }).click()
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const setUploadFile = (page, filename, bytes, mimeType = 'application/pdf') =>
  page.getByLabel(copy.file.label).setInputFiles({
    name: filename,
    mimeType,
    buffer: bytes ?? Buffer.from('%PDF-1.4 test upload')
  })

test.describe('document upload page', () => {
  test('renders feature copy, upload constraints, empty state and working back link', async ({
    page
  }) => {
    await openDocuments(page)

    await expect(
      page.getByLabel(copy.reference.label)
    ).toHaveAccessibleDescription(copy.reference.hint)
    await expect(
      page.getByRole('group', { name: copy.dateOfIssue.label })
    ).toContainText(copy.dateOfIssue.hint)
    await expect(page.getByLabel(copy.file.label)).toHaveAttribute(
      'accept',
      ACCEPT_ATTRIBUTE
    )
    await expect(page.getByText(copy.file.mustBe)).toBeVisible()
    await expect(
      page.getByText(`${copy.file.smallerThan} ${MAX_FILE_SIZE_LABEL}`)
    ).toBeVisible()
    await expect(
      page.getByText(`${copy.file.a} ${ALLOWED_FILE_TYPES_HINT}`)
    ).toBeVisible()
    await expect(page.getByText(copy.empty)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.addAnother })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.continueButton })
    ).toBeVisible()

    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('shows every metadata, file-type and size validation rule with value preservation', async ({
    page
  }) => {
    test.slow()
    await openDocuments(page)
    await page.getByRole('button', { name: copy.addAnother }).click()

    for (const message of [
      copy.errors.referenceRequired,
      copy.errors.dateRequired,
      copy.errors.fileRequired
    ]) {
      await expect(errorLink(page, message)).toBeVisible()
    }

    const reference = 'R'.repeat(59)
    await page.getByLabel(copy.reference.label).fill(reference)
    await page.getByLabel('Day').fill('31')
    await page.getByLabel('Month').fill('2')
    await page.getByLabel('Year').fill('2026')
    await setUploadFile(
      page,
      'notes.zip',
      Buffer.from('zip bytes'),
      'application/zip'
    )
    await page.getByRole('button', { name: copy.addAnother }).click()

    for (const message of [
      copy.errors.referenceMaxLength,
      copy.errors.dateInvalid,
      FILE_TYPE_MESSAGE
    ]) {
      await expect(errorLink(page, message)).toBeVisible()
    }
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(reference)
    await expect(page.getByLabel('Day')).toHaveValue('31')
    await expect(page.getByLabel('Month')).toHaveValue('2')
    await expect(page.getByLabel('Year')).toHaveValue('2026')

    await setUploadFile(
      page,
      'oversize.pdf',
      Buffer.alloc(MAX_FILE_SIZE_BYTES + 100_000, 1)
    )
    await page.getByRole('button', { name: copy.addAnother }).click()
    await expect(
      page.locator('li[data-client-error="file-size-summary"]')
    ).toContainText(OVERSIZE_FILE_MESSAGE)
    await expect(page.locator('.govuk-error-summary__title')).toBeFocused()
    await expect(page.getByLabel(copy.file.label)).toHaveAttribute(
      'aria-describedby',
      /file-error/
    )

    await page.evaluate(() =>
      document.querySelector('form[data-max-file-size]').submit()
    )
    await expect(errorLink(page, OVERSIZE_FILE_MESSAGE)).toBeVisible()
    await expect(page.getByText(copy.empty)).toBeVisible()
  })

  test('uploads through the configured stub, renders its row, downloads and removes it', async ({
    page
  }) => {
    test.slow()
    await openDocuments(page)
    const [document] = values.documents
    const issued = document.accompanyingDocumentDateOfIssue
    await addDocument(page, document)

    const row = page.locator('.govuk-table__row', {
      hasText: document.accompanyingDocumentReference
    })
    await expect(row).toContainText(
      copy.types[document.accompanyingDocumentType]
    )
    await expect(row).toContainText(
      `${issued.day}/${issued.month}/${issued.year}`
    )
    await expect(row).toContainText(copy.scanTags.checking)
    await expect(page.getByLabel(copy.reference.label)).toHaveValue('')
    await expect(row).toContainText(copy.scanTags.safe)

    const viewFile = row.getByRole('link', {
      name: `${copy.viewFile} ${copy.viewFileHidden(1)}`
    })
    const href = await viewFile.getAttribute('href')
    const response = await page.request.get(
      new URL(href, page.url()).toString()
    )
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/pdf')
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
    expect((await response.text()).startsWith('%PDF-')).toBe(true)

    await row
      .getByRole('button', {
        name: `${copy.remove} ${copy.removeHidden(1)}`,
        exact: true
      })
      .click()
    await expect(row).toHaveCount(0)
    await expect(page.getByText(copy.empty)).toBeVisible()
  })

  test('empty and populated upload states have no serious or critical axe violations', async ({
    page
  }) => {
    test.slow()
    await openDocuments(page)
    const scan = async (name) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
      const seriousOrCritical = results.violations.filter(({ impact }) =>
        ['serious', 'critical'].includes(impact)
      )
      expect(
        seriousOrCritical,
        `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
      ).toEqual([])
    }

    await scan('Empty document upload page')
    await addDocument(page, values.documents[0])
    await expect(
      page.locator('.govuk-table__row', {
        hasText: values.documents[0].accompanyingDocumentReference
      })
    ).toContainText(copy.scanTags.safe)
    await scan('Populated document upload page')
  })
})
