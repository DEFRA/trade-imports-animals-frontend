import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  signIn,
  startNotification,
  unlockSections,
  values
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import { REFERENCE_MAX_LENGTH } from '../form/payload.js'
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_FILE_TYPES_HINT,
  FILE_TYPE_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  OVERSIZE_FILE_MESSAGE
} from '../upload-config.js'

const HTTP_OK = 200
const DATE_OF_ISSUE_TEXT = '03/01/2026'
const OVERSIZE_FILENAME = 'oversize.pdf'

const openDocuments = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: 'Uploaded documents' }).click()
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const rowFor = (scope, reference) =>
  scope.locator('.govuk-table__row', { hasText: reference })

// The enhanced upload hides the input inside a drop zone and puts a button in
// front of it carrying the field's id, so the element that takes the file and
// the control the trader reaches are two different elements.
const fileInput = (page) => page.locator('input[type="file"]')

const uploadControl = (scope) =>
  scope.getByRole('button', { name: copy.file.label })

const setUploadFile = (page, filename, bytes, mimeType = 'application/pdf') =>
  fileInput(page).setInputFiles({
    name: filename,
    mimeType,
    buffer: bytes ?? Buffer.from('%PDF-1.4 test upload')
  })

const validDocument = {
  accompanyingDocumentReference: 'ITAHC-2026-0001',
  accompanyingDocumentType: 'ITAHC',
  accompanyingDocumentDateOfIssue: DATE_OF_ISSUE_TEXT,
  filename: 'itahc-upload.pdf'
}

const fillMetadata = async (page, document = validDocument) => {
  await page
    .getByLabel(copy.reference.label)
    .fill(document.accompanyingDocumentReference)
  await page
    .getByLabel(copy.documentType.label)
    .selectOption(document.accompanyingDocumentType)
  await page
    .getByLabel(copy.dateOfIssue.label)
    .fill(document.accompanyingDocumentDateOfIssue)
}

const fillDocument = async (page, document = validDocument) => {
  await fillMetadata(page, document)
  await setUploadFile(page, document.filename)
}

const submitAdd = (page) =>
  page.getByRole('button', { name: copy.addAnother }).click()

const uploadDocument = async (page, document = validDocument) => {
  await fillDocument(page, document)
  await submitAdd(page)
}

const expectPreservedMetadata = async (page) => {
  await expect(page.getByLabel(copy.reference.label)).toHaveValue(
    validDocument.accompanyingDocumentReference
  )
  await expect(page.getByLabel(copy.documentType.label)).toHaveValue(
    validDocument.accompanyingDocumentType
  )
  await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue(
    validDocument.accompanyingDocumentDateOfIssue
  )
}

const expectNoSeriousAxeViolations = async (page, name) => {
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

test.describe('document upload page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
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
    await expect(page.getByLabel(copy.documentType.label)).toHaveValue('')
    await expect(fileInput(page)).toHaveAttribute('accept', ACCEPT_ATTRIBUTE)
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

  test('offers the thirteen document types behind a placeholder, between the reference and the date', async ({
    page
  }) => {
    const select = page.getByLabel(copy.documentType.label)
    await expect(select.getByRole('option')).toHaveText([
      copy.documentType.placeholder,
      copy.types.ITAHC,
      copy.types.VETERINARY_HEALTH_CERTIFICATE,
      copy.types.AIR_WAYBILL,
      copy.types.IMPORT_PERMIT,
      copy.types.LETTER_OF_AUTHORITY,
      copy.types.COMMERCIAL_INVOICE,
      copy.types.SEA_WAYBILL,
      copy.types.RAIL_WAYBILL,
      copy.types.BILL_OF_LADING,
      copy.types.CATCH_CERTIFICATE,
      copy.types.LABORATORY_SAMPLING_RESULTS_FOR_AFLATOXIN,
      copy.types.JOURNEY_LOG,
      copy.types.OTHER
    ])
    // The design keeps this one for its own internal testing release.
    await expect(
      select.getByRole('option', {
        name: copy.types.HEALTH_CERTIFICATE,
        exact: true
      })
    ).toHaveCount(0)

    // A locator resolves in document order, so this pins where the select sits.
    const controlIds = await page
      .locator(
        '#accompanyingDocumentReference, #accompanyingDocumentType, #accompanyingDocumentDateOfIssue'
      )
      .evaluateAll((controls) => controls.map((control) => control.id))
    expect(controlIds).toEqual([
      'accompanyingDocumentReference',
      'accompanyingDocumentType',
      'accompanyingDocumentDateOfIssue'
    ])
  })

  test('groups the fields and the add button under the file upload heading, leaving the page actions outside', async ({
    page
  }) => {
    const fileUpload = page.getByRole('region', {
      name: copy.fileUploadHeading
    })
    await expect(
      fileUpload.getByRole('heading', { name: copy.fileUploadHeading })
    ).toBeVisible()
    await expect(fileUpload.getByLabel(copy.reference.label)).toBeVisible()
    await expect(fileUpload.getByLabel(copy.documentType.label)).toBeVisible()
    await expect(fileUpload.getByLabel(copy.dateOfIssue.label)).toBeVisible()
    await expect(uploadControl(fileUpload)).toBeVisible()
    await expect(
      fileUpload.getByRole('button', { name: copy.addAnother })
    ).toBeVisible()
    await expect(
      fileUpload.getByRole('button', { name: copy.continueButton })
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.continueButton })
    ).toBeVisible()
  })

  test('back link returns to the overview', async ({ page }) => {
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })
})

test.describe('document upload reference validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
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
    const reference = 'R'.repeat(REFERENCE_MAX_LENGTH + 1)
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
})

test.describe('document upload type validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('type validation: leaving the placeholder links to and focuses the select, preserving the other answers', async ({
    page
  }) => {
    await fillDocument(page, {
      ...validDocument,
      accompanyingDocumentType: ''
    })
    await submitAdd(page)

    const link = errorLink(page, copy.errors.typeRequired)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.documentType.label)).toBeFocused()
    await expect(page.getByLabel(copy.documentType.label)).toHaveValue('')
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(
      validDocument.accompanyingDocumentReference
    )
    await expect(page.getByLabel(copy.dateOfIssue.label)).toHaveValue(
      validDocument.accompanyingDocumentDateOfIssue
    )
  })

  test('the chosen type is what the saved row reports, whatever the file is called', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page, {
      ...validDocument,
      accompanyingDocumentType: 'COMMERCIAL_INVOICE',
      filename: 'itahc-upload.pdf'
    })

    const row = rowFor(page, validDocument.accompanyingDocumentReference)
    await expect(row).toContainText(copy.types.COMMERCIAL_INVOICE)
    await expect(page.getByLabel(copy.documentType.label)).toHaveValue('')
  })
})

test.describe('document upload date validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
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
})

test.describe('document upload file validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('file validation: no file links to and focuses the upload while preserving metadata', async ({
    page
  }) => {
    await fillMetadata(page)
    await submitAdd(page)

    const link = errorLink(page, copy.errors.fileRequired)
    await expect(link).toBeVisible()
    await link.click()
    await expect(uploadControl(page)).toBeFocused()
    await expectPreservedMetadata(page)
  })

  test('file validation: unsupported type links to and focuses the upload while preserving metadata', async ({
    page
  }) => {
    await fillMetadata(page)
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
    await expect(uploadControl(page)).toBeFocused()
    await expectPreservedMetadata(page)
  })
})

test.describe('document upload oversize validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('file validation: client-side oversize error focuses the summary and retains metadata', async ({
    page
  }) => {
    test.slow()
    await fillMetadata(page)
    await setUploadFile(
      page,
      OVERSIZE_FILENAME,
      Buffer.alloc(MAX_FILE_SIZE_BYTES + 100_000, 1)
    )
    await submitAdd(page)

    await expect(
      page.locator('li[data-client-error="file-size-summary"]')
    ).toContainText(OVERSIZE_FILE_MESSAGE)
    await expect(page.locator('.govuk-error-summary__title')).toBeFocused()
    await expect(uploadControl(page)).toHaveAttribute(
      'aria-describedby',
      /file-error/
    )
    const clientMessage = page.locator(
      '[data-client-error="file-size-message"]'
    )
    await expect(clientMessage).toContainText(OVERSIZE_FILE_MESSAGE)
    // GDS order is label, hint, error, control: the message goes above the
    // whole drop zone, never inside it under the Choose file button.
    await expect(
      page.locator(
        '.govuk-file-upload-wrapper [data-client-error="file-size-message"]'
      )
    ).toHaveCount(0)
    await expect(
      page.locator(
        '.govuk-form-group--error > [data-client-error="file-size-message"]'
      )
    ).toHaveCount(1)
    await expectPreservedMetadata(page)
  })

  // The enhanced upload renames the input to file-input and gives the new
  // button the original id, so the summary link has to point at the button.
  // Pointing it at the input sends focus to a hidden element.
  test('file validation: the client-side oversize summary link focuses the upload control', async ({
    page
  }) => {
    test.slow()
    await fillMetadata(page)
    await setUploadFile(
      page,
      OVERSIZE_FILENAME,
      Buffer.alloc(MAX_FILE_SIZE_BYTES + 100_000, 1)
    )
    await submitAdd(page)

    const link = page
      .locator('li[data-client-error="file-size-summary"]')
      .getByRole('link', { name: OVERSIZE_FILE_MESSAGE })
    await expect(link).toBeVisible()
    await link.click()
    await expect(uploadControl(page)).toBeFocused()
  })

  test('file validation: server rejects an oversize multipart payload', async ({
    page
  }) => {
    test.slow()
    await fillDocument(page)
    await setUploadFile(
      page,
      OVERSIZE_FILENAME,
      Buffer.alloc(MAX_FILE_SIZE_BYTES + 100_000, 1)
    )
    await page.evaluate(() =>
      document.querySelector('form[data-max-file-size]').submit()
    )

    const link = errorLink(page, OVERSIZE_FILE_MESSAGE)
    await expect(link).toBeVisible()
    await link.click()
    await expect(uploadControl(page)).toBeFocused()
    await expect(page.getByText(copy.empty)).toBeVisible()
  })
})

test.describe('document upload saved rows', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('uploads through the configured stub and renders the saved row', async ({
    page
  }) => {
    test.slow()
    const [document] = values.documents
    const issued = document.accompanyingDocumentDateOfIssue
    await uploadDocument(page, {
      accompanyingDocumentReference: document.accompanyingDocumentReference,
      accompanyingDocumentType: document.accompanyingDocumentType,
      accompanyingDocumentDateOfIssue: `${issued.day}/${issued.month}/${issued.year}`,
      filename: document.filename
    })

    const row = rowFor(page, document.accompanyingDocumentReference)
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

  test('keeps the saved row inside the file upload group and the page actions outside it', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const fileUpload = page.getByRole('region', {
      name: copy.fileUploadHeading
    })
    await expect(
      rowFor(fileUpload, validDocument.accompanyingDocumentReference)
    ).toBeVisible()
    await expect(
      fileUpload.getByRole('button', { name: copy.continueButton })
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.continueButton })
    ).toBeVisible()
  })

  test('downloads a saved document with safe response headers', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const row = rowFor(page, validDocument.accompanyingDocumentReference)
    await expect(row).toContainText(copy.scanTags.safe)
    const viewFile = row.getByRole('link', {
      name: `${copy.viewFile} ${copy.viewFileHidden(1)}`
    })
    const href = await viewFile.getAttribute('href')
    const response = await page.request.get(
      new URL(href, page.url()).toString()
    )
    expect(response.status()).toBe(HTTP_OK)
    expect(response.headers()['content-type']).toContain('application/pdf')
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
    expect((await response.text()).startsWith('%PDF-')).toBe(true)
  })

  test('removes a saved document and restores the empty state', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const row = rowFor(page, validDocument.accompanyingDocumentReference)
    await row
      .getByRole('button', {
        name: `${copy.remove} ${copy.removeHidden(1)}`,
        exact: true
      })
      .click()
    await expect(row).toHaveCount(0)
    await expect(page.getByText(copy.empty)).toBeVisible()
  })
})

test.describe('document upload capacity and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('rejects another upload after the maximum document capacity is reached', async ({
    page
  }) => {
    test.slow()
    for (let index = 1; index <= MAX_DOCUMENTS; index++) {
      await uploadDocument(page, {
        ...validDocument,
        accompanyingDocumentReference: `ITAHC-CAPACITY-${index}`,
        filename: `itahc-capacity-${index}.pdf`
      })
    }
    await fillDocument(page, {
      ...validDocument,
      accompanyingDocumentReference: 'ITAHC-ONE-TOO-MANY',
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
    await expectNoSeriousAxeViolations(page, 'Empty document upload page')
  })

  test('validation error state has no serious or critical axe violations', async ({
    page
  }) => {
    await submitAdd(page)
    await expect(page.locator('.govuk-error-summary')).toBeVisible()
    await expect(page.locator('#accompanyingDocumentType-error')).toBeVisible()
    await expectNoSeriousAxeViolations(page, 'Document upload error state')
  })

  test('document date picker has no serious or critical axe violations', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Choose date' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectNoSeriousAxeViolations(page, 'Document date picker dialog')
  })

  test('populated upload state has no serious or critical axe violations', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    await expect(
      rowFor(page, validDocument.accompanyingDocumentReference)
    ).toContainText(copy.scanTags.safe)
    await expectNoSeriousAxeViolations(page, 'Populated document upload page')
  })
})
