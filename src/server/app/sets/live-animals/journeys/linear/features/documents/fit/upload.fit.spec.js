import { expect, test } from '@playwright/test'
import {
  describeCalendarPosition,
  documentRowFor,
  expectNoHorizontalOverflow,
  expectNoSeriousOrCriticalViolations,
  journeyUrl,
  openDatePicker,
  openDocuments,
  saveAndReturnToHub,
  setUploadFile,
  signIn,
  values,
  withinFullWidthColumn,
  withinTwoThirdsColumn
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import { REFERENCE_MAX_LENGTH } from '../../../../../../../services/document-uploads/claim-contract.js'
import {
  ACCEPT_ATTRIBUTE,
  fileTypeMessage,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  oversizeMessage,
  allowedFileTypesHint
} from '../upload-config.js'

const HTTP_OK = 200
const DATE_OF_ISSUE_TEXT = '03/01/2026'
const OVERSIZE_FILENAME = 'oversize.pdf'
const CLIENT_SIZE_SUMMARY = 'li[data-client-error="file-size-summary"]'

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

const fileUploadCard = (page) =>
  page.getByRole('region', { name: copy.fileUploadHeading })

const addedDocumentsTable = (page) =>
  fileUploadCard(page).getByRole('table', { name: copy.table.caption })

const escapeRegExp = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

const expectNoDocumentsAdded = async (page) => {
  await expect(addedDocumentsTable(page)).toHaveCount(0)
  await expect(fileUploadCard(page)).toHaveText(
    new RegExp(`${escapeRegExp(copy.addAnother)}\\s*$`)
  )
}

const expectSaveAndContinueOutsideCard = async (page) => {
  await expect(
    fileUploadCard(page).getByRole('button', {
      name: sharedCopy.saveActions.saveAndContinue,
      exact: true
    })
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', {
      name: sharedCopy.saveActions.saveAndContinue,
      exact: true
    })
  ).toBeVisible()
}

const actionsCellOf = (row) => row.getByRole('cell').last()

const expectViewFileAndRemoveInCell = async (actionsCell) => {
  await expect(
    actionsCell.getByRole('link', {
      name: `${copy.viewFile} ${copy.viewFileHidden(1)}`
    })
  ).toBeVisible()
  await expect(
    actionsCell.getByRole('button', {
      name: `${copy.remove} ${copy.removeHidden(1)}`,
      exact: true
    })
  ).toBeVisible()
}

const LONG_REFERENCE = 'R'.repeat(REFERENCE_MAX_LENGTH)

const expectLongReferenceFitsCard = async (
  page,
  { afterUpload = async () => {} } = {}
) => {
  await uploadDocument(page, {
    ...validDocument,
    accompanyingDocumentReference: LONG_REFERENCE
  })
  await afterUpload()
  await expect(documentRowFor(page, LONG_REFERENCE)).toContainText(
    copy.scanTags.complete
  )
  await expect(withinTwoThirdsColumn(addedDocumentsTable(page))).toHaveCount(0)
  await expectNoHorizontalOverflow(fileUploadCard(page), 'File upload card')
}

const fileInput = (page) => page.locator('input[type="file"]')

const uploadControl = (scope) =>
  scope.getByRole('button', { name: copy.file.label })

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

const submitContinue = (page) =>
  page
    .getByRole('button', {
      name: sharedCopy.saveActions.saveAndContinue,
      exact: true
    })
    .click()

const expectCompleteDocumentSavedByReturnToOverview = async (page) => {
  await fillDocument(page)
  await saveAndReturnToHub(page).click()

  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.getByRole('link', { name: copy.title }).click()
  await expect(
    documentRowFor(page, validDocument.accompanyingDocumentReference)
  ).toContainText(copy.types.ITAHC)
}

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

test.describe('document upload page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('renders the reference with no hint, the date hint, the upload constraints and no added-documents table', async ({
    page
  }) => {
    await expect(
      page.getByLabel(copy.reference.label)
    ).toHaveAccessibleDescription('')
    await expect(
      page.getByLabel(copy.dateOfIssue.label)
    ).toHaveAccessibleDescription(copy.dateOfIssue.hint)
    await expect(page.getByLabel(copy.documentType.label)).toHaveValue('')
    await expect(fileInput(page)).toHaveAttribute('accept', ACCEPT_ATTRIBUTE)
    await expect(page.getByText(copy.file.mustBe)).toBeVisible()
    await expect(
      page.getByText(copy.file.smallerThan(MAX_FILE_SIZE_LABEL), {
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByText(copy.file.allowedTypes(allowedFileTypesHint(copy)), {
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByText(copy.file.upToMaximum(MAX_DOCUMENTS))
    ).toBeVisible()
    await expect(page.getByText(copy.file.noZipFiles)).toBeVisible()
    await expectNoDocumentsAdded(page)
    await expect(
      page.getByRole('button', { name: copy.addAnother })
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: sharedCopy.saveActions.saveAndContinue,
        exact: true
      })
    ).toBeVisible()
  })

  test('offers thirteen document types behind the select text, between the reference and the date', async ({
    page
  }) => {
    const select = page.getByLabel(copy.documentType.label)
    await expect(select.getByRole('option')).toHaveText([
      copy.documentType.selectText,
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
    const fileUpload = fileUploadCard(page)
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
    await expectSaveAndContinueOutsideCard(page)
  })

  test('puts the card in the full-width column, the guidance in a two-thirds column and the fields in a two-thirds column inside the card', async ({
    page
  }) => {
    const card = fileUploadCard(page)
    await expect(withinFullWidthColumn(card)).toHaveCount(1)
    await expect(withinTwoThirdsColumn(card)).toHaveCount(0)
    await expect(
      withinTwoThirdsColumn(page.getByText(copy.guidance.intro))
    ).toHaveCount(1)
    await expect(
      withinTwoThirdsColumn(
        page.getByRole('heading', { name: copy.title, level: 1 })
      )
    ).toHaveCount(1)
    await expect(
      withinTwoThirdsColumn(card.getByLabel(copy.reference.label))
    ).toHaveCount(1)
    await expect(
      withinTwoThirdsColumn(card.getByRole('button', { name: copy.addAnother }))
    ).toHaveCount(1)
  })

  test('back link returns to the overview', async ({ page }) => {
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('back link opens the review when the page was opened by changing an answer from the review', async ({
    page
  }) => {
    await page.goto(`${journeyUrl(page, 'accompanying-documents')}?change=1`)
    await page.locator('.govuk-back-link').click()

    await expect(
      page.getByRole('heading', { name: 'Review your notification' })
    ).toBeVisible()
  })

  describeCalendarPosition({
    fieldName: 'date of issue',
    label: copy.dateOfIssue.label,
    nextQuestionLabel: (page) => page.locator('label[for="file"]')
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

  test('reference validation: over the maximum length links to and focuses the preserved value', async ({
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

  test('type validation: leaving the select text links to and focuses the select, preserving the other answers', async ({
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

    const row = documentRowFor(
      page,
      validDocument.accompanyingDocumentReference
    )
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

  test('file validation: unsupported type links to and focuses the upload while preserving metadata, and adds no document', async ({
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

    const link = errorLink(page, fileTypeMessage(copy))
    await expect(link).toBeVisible()
    await link.click()
    await expect(uploadControl(page)).toBeFocused()
    await expectPreservedMetadata(page)
    await expect(page.getByText(copy.file.noZipFiles)).toBeVisible()
    await expectNoDocumentsAdded(page)
  })

  test('file validation: a file carrying no bytes is refused on receipt', async ({
    page
  }) => {
    test.slow()
    await fillMetadata(page)
    await setUploadFile(page, 'itahc-empty.pdf', Buffer.alloc(0))
    await submitAdd(page)

    const link = errorLink(page, copy.errors.fileEmpty)
    await expect(link).toBeVisible()
    await link.click()
    await expect(uploadControl(page)).toBeFocused()
    await expectPreservedMetadata(page)
    await expectNoDocumentsAdded(page)
  })
})

test.describe('document upload oversize validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('file validation: client-side oversize error focuses the summary and retains metadata, and adds no document', async ({
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

    await expect(page.locator(CLIENT_SIZE_SUMMARY)).toContainText(
      oversizeMessage(copy)
    )
    await expect(page.locator('.govuk-error-summary__title')).toBeFocused()
    await expect(uploadControl(page)).toHaveAttribute(
      'aria-describedby',
      /file-error/
    )
    const clientMessage = page.locator(
      '[data-client-error="file-size-message"]'
    )
    await expect(clientMessage).toContainText(oversizeMessage(copy))
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
    await expectNoDocumentsAdded(page)
  })

  test('file validation: an oversize file in the input stops Save and continue with the client oversize summary', async ({
    page
  }) => {
    test.slow()
    await setUploadFile(
      page,
      OVERSIZE_FILENAME,
      Buffer.alloc(MAX_FILE_SIZE_BYTES + 100_000, 1)
    )
    await submitContinue(page)

    await expect(page.locator(CLIENT_SIZE_SUMMARY)).toContainText(
      oversizeMessage(copy)
    )
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })

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
      .getByRole('link', { name: oversizeMessage(copy) })
    await expect(link).toBeVisible()
    await link.click()
    await expect(uploadControl(page)).toBeFocused()
  })

  test('file validation: a file the upload service refuses as too large is reported on receipt', async ({
    page
  }) => {
    test.slow()
    await fillMetadata(page)
    await setUploadFile(page, OVERSIZE_FILENAME)
    await submitAdd(page)

    const link = errorLink(page, oversizeMessage(copy))
    await expect(link).toBeVisible()
    await link.click()
    await expect(uploadControl(page)).toBeFocused()
    await expectNoDocumentsAdded(page)
  })
})

test.describe('document upload continue', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('Save and return to overview with every detail filled in shows Overview, and reopening lists the document with its chosen type', async ({
    page
  }) => {
    test.slow()
    await expectCompleteDocumentSavedByReturnToOverview(page)
  })

  test('continue with a document type and nothing else says what is missing', async ({
    page
  }) => {
    await page
      .getByLabel(copy.documentType.label)
      .selectOption(validDocument.accompanyingDocumentType)
    await submitContinue(page)

    await expect(errorLink(page, copy.errors.referenceRequired)).toBeVisible()
    await expect(errorLink(page, copy.errors.dateRequired)).toBeVisible()
    await expect(errorLink(page, copy.errors.fileRequired)).toBeVisible()
    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })

  test('continue with an untouched form leaves the page, uploading being optional', async ({
    page
  }) => {
    await submitContinue(page)
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
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

    const row = documentRowFor(page, document.accompanyingDocumentReference)
    await expect(row).toContainText(
      copy.types[document.accompanyingDocumentType]
    )
    await expect(row).toContainText(
      `${issued.day}/${issued.month}/${issued.year}`
    )
    await expect(row).toContainText(copy.scanTags.scanning)
    await expect(page.getByLabel(copy.reference.label)).toHaveValue('')
    await expect(row).toContainText(copy.scanTags.complete)
  })

  test('keeps the saved row inside the file upload group and the page actions outside it', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const fileUpload = fileUploadCard(page)
    await expect(
      documentRowFor(fileUpload, validDocument.accompanyingDocumentReference)
    ).toBeVisible()
    await expectSaveAndContinueOutsideCard(page)
  })

  test('keeps a long reference inside the full-width card, with the table outside any two-thirds column', async ({
    page
  }) => {
    test.slow()
    await expectLongReferenceFitsCard(page)
  })

  test('lists the document under five headings with View file and Remove right-aligned at the end of the row', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const row = documentRowFor(
      page,
      validDocument.accompanyingDocumentReference
    )
    await expect(row).toContainText(copy.scanTags.complete)

    await expect(
      addedDocumentsTable(page).getByRole('columnheader')
    ).toHaveText([
      copy.table.reference,
      copy.table.type,
      copy.table.dateOfIssue,
      copy.table.status,
      copy.table.actionsHidden
    ])
    const actionsCell = actionsCellOf(row)
    await expectViewFileAndRemoveInCell(actionsCell)
    await expect(actionsCell).toHaveCSS('text-align', 'right')
    await expect(
      addedDocumentsTable(page).getByRole('columnheader').last()
    ).toHaveCSS('text-align', 'right')
  })

  test('keeps stating the document limit once a document is saved', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    await expect(
      documentRowFor(page, validDocument.accompanyingDocumentReference)
    ).toBeVisible()
    await expect(
      page.getByText(copy.file.upToMaximum(MAX_DOCUMENTS))
    ).toBeVisible()
  })

  test('downloads a saved document with safe response headers', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const row = documentRowFor(
      page,
      validDocument.accompanyingDocumentReference
    )
    await expect(row).toContainText(copy.scanTags.complete)
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

  test('removes a saved document and leaves the page showing no added-documents table', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    const row = documentRowFor(
      page,
      validDocument.accompanyingDocumentReference
    )
    await row
      .getByRole('button', {
        name: `${copy.remove} ${copy.removeHidden(1)}`,
        exact: true
      })
      .click()
    await expect(row).toHaveCount(0)
    await expectNoDocumentsAdded(page)
  })
})

test.describe('document upload capacity and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('closes the add control once the maximum document capacity is reached, so no further file is sent', async ({
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

    const message = copy.errors.maxDocuments(MAX_DOCUMENTS)
    await expect(page.getByText(message)).toBeVisible()

    const addButton = page.getByRole('button', { name: copy.addAnother })
    await expect(addButton).toHaveAttribute('aria-disabled', 'true')
    await expect(addButton).not.toHaveAttribute('formaction', /./)
    await expect(addButton).toHaveAccessibleDescription(new RegExp(message))
  })

  test('empty upload state has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(
      page,
      'Empty document upload page'
    )
  })

  test('validation error state has no serious or critical axe violations', async ({
    page
  }) => {
    await submitAdd(page)
    await expect(page.locator('.govuk-error-summary')).toBeVisible()
    await expect(page.locator('#accompanyingDocumentType-error')).toBeVisible()
    await expectNoSeriousOrCriticalViolations(
      page,
      'Document upload error state'
    )
  })

  test('document date picker has no serious or critical axe violations', async ({
    page
  }) => {
    await openDatePicker(page, copy.dateOfIssue.label)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Document date picker dialog'
    )
  })

  test('populated upload state has no serious or critical axe violations', async ({
    page
  }) => {
    test.slow()
    await uploadDocument(page)
    await expect(
      documentRowFor(page, validDocument.accompanyingDocumentReference)
    ).toContainText(copy.scanTags.complete)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Populated document upload page'
    )
  })
})

test.describe('document upload page without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('lays out the empty page with two-thirds guidance and a full-width card showing no added-documents table', async ({
    page
  }) => {
    const card = fileUploadCard(page)
    await expect(
      withinTwoThirdsColumn(page.getByText(copy.guidance.intro))
    ).toHaveCount(1)
    await expect(withinFullWidthColumn(card)).toHaveCount(1)
    await expect(withinTwoThirdsColumn(card)).toHaveCount(0)
    await expectNoDocumentsAdded(page)
  })

  test('keeps a long reference inside the card with View file and Remove on the row', async ({
    page
  }) => {
    await expectLongReferenceFitsCard(page, {
      afterUpload: () =>
        page.getByRole('link', { name: copy.refreshStatus }).click()
    })
    await expectViewFileAndRemoveInCell(
      actionsCellOf(documentRowFor(page, LONG_REFERENCE))
    )
  })

  test('Save and return to overview with every detail filled in shows Overview, and reopening lists the document with its chosen type', async ({
    page
  }) => {
    test.slow()
    await expectCompleteDocumentSavedByReturnToOverview(page)
  })

  test('Save and return to overview with a part-filled document stays on the page with an error for each missing detail and the typed reference kept', async ({
    page
  }) => {
    await page
      .getByLabel(copy.reference.label)
      .fill(validDocument.accompanyingDocumentReference)
    await saveAndReturnToHub(page).click()

    await expect(errorLink(page, copy.errors.typeRequired)).toBeVisible()
    await expect(errorLink(page, copy.errors.dateRequired)).toBeVisible()
    await expect(errorLink(page, copy.errors.fileRequired)).toBeVisible()
    await expect(page.getByLabel(copy.reference.label)).toHaveValue(
      validDocument.accompanyingDocumentReference
    )
    await expectNoDocumentsAdded(page)
  })
})
