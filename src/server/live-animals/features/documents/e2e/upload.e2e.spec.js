import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  startNotification,
  unlockSections,
  values
} from '../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
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

const validDocument = {
  accompanyingDocumentReference: 'ITAHC-2026-0001',
  accompanyingDocumentDateOfIssue: '03/01/2026',
  filename: 'itahc-upload.pdf'
}

const fillDocument = async (page, document = validDocument) => {
  await page
    .getByLabel(copy.reference.label)
    .fill(document.accompanyingDocumentReference)
  await page
    .getByLabel(copy.dateOfIssue.label)
    .fill(document.accompanyingDocumentDateOfIssue)
  await setUploadFile(page, document.filename)
}

const submitAdd = (page) =>
  page.getByRole('button', { name: copy.addAnother }).click()

const uploadDocument = async (page, document = validDocument) => {
  await fillDocument(page, document)
  await submitAdd(page)
}

test.describe('document upload page', () => {
  test.beforeEach(async ({ page }) => {
    await openDocuments(page)
  })

  test('renders feature copy, upload constraints and empty state', async ({
    page
  }) => {
    await expect(
      page.getByLabel(copy.reference.label)
    ).toHaveAccessibleDescription(copy.reference.hint)
    await expect(
      page.getByLabel(copy.dateOfIssue.label)
    ).toHaveAccessibleDescription(copy.dateOfIssue.hint)
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
  })

  test('back link returns to the overview', async ({ page }) => {
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('reference validation: empty value links to and focuses the preserved field', async ({
    page
  }) => {
    await fillDocument(page, {
      ...validDocument,
      accompanyingDocumentReference: ''
    })
    await submitAdd(page)

    const link = errorLink(page, copy.errors.referenceRequired)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.reference.label)).toBeFocused()
    await expect(page.getByLabel(copy.reference.label)).toHaveValue('')
    await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue(
      validDocument.accompanyingDocumentDateOfIssue
    )
  })

  test('reference validation: over 58 characters links to and focuses the preserved value', async ({
    page
  }) => {
    const reference = 'R'.repeat(59)
    await fillDocument(page, {
      ...validDocument,
      accompanyingDocumentReference: reference
    })
    await submitAdd(page)

    const link = errorLink(page, copy.errors.referenceMaxLength)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.reference.label)).toBeFocused()
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(reference)
    await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue(
      validDocument.accompanyingDocumentDateOfIssue
    )
  })

  test('date validation: empty value links to and focuses the preserved field', async ({
    page
  }) => {
    await fillDocument(page, {
      ...validDocument,
      accompanyingDocumentDateOfIssue: ''
    })
    await submitAdd(page)

    const link = errorLink(page, copy.errors.dateRequired)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.dateOfIssue.label)).toBeFocused()
    await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue('')
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(
      validDocument.accompanyingDocumentReference
    )
  })

  test('date validation: impossible date links to and focuses the preserved value', async ({
    page
  }) => {
    await fillDocument(page, {
      ...validDocument,
      accompanyingDocumentDateOfIssue: '31/2/2026'
    })
    await submitAdd(page)

    const link = errorLink(page, copy.errors.dateInvalid)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.dateOfIssue.label)).toBeFocused()
    await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue(
      '31/2/2026'
    )
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(
      validDocument.accompanyingDocumentReference
    )
  })

  test('file validation: no file links to and focuses the upload while preserving metadata', async ({
    page
  }) => {
    await page
      .getByLabel(copy.reference.label)
      .fill(validDocument.accompanyingDocumentReference)
    await page
      .getByLabel(copy.dateOfIssue.label)
      .fill(validDocument.accompanyingDocumentDateOfIssue)
    await submitAdd(page)

    const link = errorLink(page, copy.errors.fileRequired)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.file.label)).toBeFocused()
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(
      validDocument.accompanyingDocumentReference
    )
    await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue(
      validDocument.accompanyingDocumentDateOfIssue
    )
  })

  test('file validation: unsupported type links to and focuses the upload while preserving metadata', async ({
    page
  }) => {
    await page
      .getByLabel(copy.reference.label)
      .fill(validDocument.accompanyingDocumentReference)
    await page
      .getByLabel(copy.dateOfIssue.label)
      .fill(validDocument.accompanyingDocumentDateOfIssue)
    await setUploadFile(
      page,
      'notes.zip',
      Buffer.from('zip bytes'),
      'application/zip'
    )
    await submitAdd(page)

    const link = errorLink(page, FILE_TYPE_MESSAGE)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.file.label)).toBeFocused()
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(
      validDocument.accompanyingDocumentReference
    )
    await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue(
      validDocument.accompanyingDocumentDateOfIssue
    )
  })

  test('file validation: client-side oversize error focuses the summary and retains metadata', async ({
    page
  }) => {
    test.slow()
    await page
      .getByLabel(copy.reference.label)
      .fill(validDocument.accompanyingDocumentReference)
    await page
      .getByLabel(copy.dateOfIssue.label)
      .fill(validDocument.accompanyingDocumentDateOfIssue)
    await setUploadFile(
      page,
      'oversize.pdf',
      Buffer.alloc(MAX_FILE_SIZE_BYTES + 100_000, 1)
    )
    await submitAdd(page)

    await expect(
      page.locator('li[data-client-error="file-size-summary"]')
    ).toContainText(OVERSIZE_FILE_MESSAGE)
    await expect(page.locator('.govuk-error-summary__title')).toBeFocused()
    await expect(page.getByLabel(copy.file.label)).toHaveAttribute(
      'aria-describedby',
      /file-error/
    )
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(
      validDocument.accompanyingDocumentReference
    )
    await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue(
      validDocument.accompanyingDocumentDateOfIssue
    )
  })

  test('file validation: server rejects an oversize multipart payload', async ({
    page
  }) => {
    test.slow()
    await fillDocument(page)
    await setUploadFile(
      page,
      'oversize.pdf',
      Buffer.alloc(MAX_FILE_SIZE_BYTES + 100_000, 1)
    )
    await page.evaluate(() =>
      document.querySelector('form[data-max-file-size]').submit()
    )

    const link = errorLink(page, OVERSIZE_FILE_MESSAGE)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.file.label)).toBeFocused()
    await expect(page.getByText(copy.empty)).toBeVisible()
  })

  test('uploads through the configured stub and renders the saved row', async ({
    page
  }) => {
    test.slow()
    const [document] = values.documents
    const issued = document.accompanyingDocumentDateOfIssue
    await uploadDocument(page, {
      accompanyingDocumentReference: document.accompanyingDocumentReference,
      accompanyingDocumentDateOfIssue: `${issued.day}/${issued.month}/${issued.year}`,
      filename: document.filename
    })

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
  })

  test('downloads a saved document with safe response headers', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const row = page.locator('.govuk-table__row', {
      hasText: validDocument.accompanyingDocumentReference
    })
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
  })

  test('removes a saved document and restores the empty state', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const row = page.locator('.govuk-table__row', {
      hasText: validDocument.accompanyingDocumentReference
    })
    await row
      .getByRole('button', {
        name: `${copy.remove} ${copy.removeHidden(1)}`,
        exact: true
      })
      .click()
    await expect(row).toHaveCount(0)
    await expect(page.getByText(copy.empty)).toBeVisible()
  })

  test('rejects another upload after the maximum document capacity is reached', async ({
    page
  }) => {
    test.slow()
    for (let index = 1; index <= MAX_DOCUMENTS; index++) {
      await uploadDocument(page, {
        accompanyingDocumentReference: `ITAHC-CAPACITY-${index}`,
        accompanyingDocumentDateOfIssue: '03/01/2026',
        filename: `itahc-capacity-${index}.pdf`
      })
    }
    await fillDocument(page, {
      accompanyingDocumentReference: 'ITAHC-ONE-TOO-MANY',
      accompanyingDocumentDateOfIssue: '03/01/2026',
      filename: 'itahc-one-too-many.pdf'
    })
    await submitAdd(page)

    const message = copy.errors.maxDocuments(MAX_DOCUMENTS)
    const link = errorLink(page, message)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/#documents-added$/)
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(
      'ITAHC-ONE-TOO-MANY'
    )
  })

  test('empty upload state has no serious or critical axe violations', async ({
    page
  }) => {
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
  })

  test('document date picker has no serious or critical axe violations', async ({
    page
  }) => {
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

    await page.getByRole('button', { name: 'Choose date' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await scan('Document date picker dialog')
  })

  test('populated upload state has no serious or critical axe violations', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    await expect(
      page.locator('.govuk-table__row', {
        hasText: validDocument.accompanyingDocumentReference
      })
    ).toContainText(copy.scanTags.safe)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Populated document upload page has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
