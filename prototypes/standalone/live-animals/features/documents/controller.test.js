import Hapi from '@hapi/hapi'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { documentUploads } from '../../services/document-uploads/index.js'
import { dispatchPages } from '../index.js'

import * as documents from './controller.js'
import { documents as manifestDocuments } from '../../model/obligations/obligations.js'
import {
  FILE_TYPE_MESSAGE,
  MAX_FILE_SIZE_BYTES,
  MAX_PAYLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE
} from './upload-config.js'

const post = postHandlerOf(documents)
const get = documents.routes.find(
  (route) => route.method === 'GET' && !route.path.includes('remove')
).handler
const remove = documents.routes.find((route) =>
  route.path.includes('remove')
).handler

const pdfFile = (filename = 'itahc-certificate.pdf', size = 8) => ({
  filename,
  headers: { 'content-type': 'application/pdf' },
  payload: Buffer.alloc(size, 1)
})

const validDocument = {
  accompanyingDocumentReference: 'GBHC1234567890',
  'accompanyingDocumentDateOfIssue-day': '12',
  'accompanyingDocumentDateOfIssue-month': '12',
  'accompanyingDocumentDateOfIssue-year': '2025'
}

const storedDocument = (overrides = {}) => ({
  accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' },
  ...overrides
})

const summaryTexts = (result) =>
  (result.view.context.errorSummary?.errorList ?? []).map((item) => item.text)

describe('documents — real upload leg on the single-page loop', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render an unreal date of issue with its message and append nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        file: pdfFile(),
        'accompanyingDocumentDateOfIssue-day': '31',
        'accompanyingDocumentDateOfIssue-month': '2',
        'accompanyingDocumentDateOfIssue-year': '2000'
      }
    })
    expect(
      result.view.context.errors['accompanyingDocumentDateOfIssue-day']
    ).toBe('Enter a real date of issue')
    expect(result.after).toEqual(result.before)
  })

  it('Should require a document reference and a date of issue at add time', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', file: pdfFile() }
    })
    expect(result.view.context.errors.accompanyingDocumentReference).toBe(
      'Enter a document reference'
    )
    expect(
      result.view.context.errors['accompanyingDocumentDateOfIssue-day']
    ).toBe('Enter the date of issue')
    expect(result.after).toEqual(result.before)
  })

  it('Should append the uploaded document with the type and attachment type derived from the filename, then redirect', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument, file: pdfFile('itahc.pdf') }
    })
    expect(result.response.redirect).toBeDefined()
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentAttachmentType).toBe('PDF')
    expect(entry.filename).toBe('itahc.pdf')
    expect(entry.uploadId).toBeDefined()
    expect(entry.accompanyingDocumentType).toBe('ITAHC')
  })

  it('Should derive Other for a filename matching no document type', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        ...validDocument,
        file: pdfFile('holiday-snaps.pdf')
      }
    })
    const [entry] = result.after.documents
    expect(entry.accompanyingDocumentType).toBe('OTHER')
  })

  it('Should refuse an add without a file and append nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument }
    })
    expect(result.view.context.errors.file).toBe('Select a file to upload')
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file type outside the allow-list', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'add', ...validDocument, file: pdfFile('notes.zip') }
    })
    expect(result.view.context.errors.file).toBe(FILE_TYPE_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a file over the 50MB limit', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'add',
        ...validDocument,
        file: pdfFile('big.pdf', MAX_FILE_SIZE_BYTES + 1)
      }
    })
    expect(result.view.context.errors.file).toBe(OVERSIZE_FILE_MESSAGE)
    expect(result.after).toEqual(result.before)
  })

  it('Should list added documents with a scan-status tag and a per-row remove link', async () => {
    const result = await driveHandler(get, {
      seed: { documents: [storedDocument()] }
    })
    const [row] = result.view.context.rows
    expect(row[0].text).toBe('GBHC1234567890')
    expect(row[1].text).toBe('Veterinary health certificate')
    expect(row[2].text).toBe('12/12/2025')
    expect(row[3].html).toContain('Safe')
    expect(row[4].html).toContain('accompanying-documents/0/remove')
  })

  it('Should show Checking on every render of a fresh upload until a refresh-link GET settles it to Safe', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const seed = {
      documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
    }
    const first = await driveHandler(get, { seed })
    expect(first.view.context.rows[0][3].html).toContain('Checking')
    expect(first.view.context.anyPending).toBe(true)
    expect(first.view.context.refreshHref).toContain('attempt=1')

    const stillPending = await driveHandler(get, { seed })
    expect(stillPending.view.context.rows[0][3].html).toContain('Checking')

    const refreshed = await driveHandler(get, { seed, query: { attempt: '1' } })
    expect(refreshed.view.context.rows[0][3].html).toContain('Safe')
    expect(refreshed.view.context.anyPending).toBe(false)

    const settled = await driveHandler(post, {
      seed,
      payload: { action: 'continue' }
    })
    expect(settled.response.redirect).toBeDefined()
  })

  it('Should block Continue while a scan is PENDING, naming the reason', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const result = await driveHandler(post, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      },
      payload: { action: 'continue' }
    })
    expect(result.response.redirect).toBeUndefined()
    expect(summaryTexts(result)).toContain(
      'You cannot continue until all documents have been scanned or removed'
    )
  })

  it('Should block Continue while a REJECTED document remains, naming the file', async () => {
    const uploadId = await documentUploads.upload({
      filename: 'virus-notes.pdf'
    })
    await documentUploads.scanStatus({
      uploadId,
      filename: 'virus-notes.pdf',
      refresh: true
    })
    const seed = {
      documents: [storedDocument({ uploadId, filename: 'virus-notes.pdf' })]
    }
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'continue' }
    })
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.rows[0][3].html).toContain('Virus found')
    expect(summaryTexts(result)).toContain(
      'virus-notes.pdf contains a virus. Remove it and try again with a different file.'
    )
  })

  it('Should let the hub exit leave the page while a scan is PENDING', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const result = await driveHandler(post, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      },
      payload: { action: 'continue', exit: 'hub' }
    })
    expect(result.response.redirect).toBeDefined()
  })

  it('Should remove the document and its upload session via the per-row remove link', async () => {
    const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })
    const result = await driveHandler(remove, {
      seed: {
        documents: [storedDocument({ uploadId, filename: 'itahc.pdf' })]
      },
      params: { index: '0' }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after.documents).toEqual([])
  })

  it('Should refuse an eleventh document with the maximum message and append nothing', async () => {
    const tenDocuments = Array.from({ length: documents.MAX_DOCUMENTS }, () =>
      storedDocument()
    )
    const result = await driveHandler(post, {
      seed: { documents: tenDocuments },
      payload: { action: 'add', ...validDocument, file: pdfFile() }
    })
    expect(summaryTexts(result)).toContain(
      `You can add a maximum of ${documents.MAX_DOCUMENTS} documents`
    )
    expect(result.after.documents).toHaveLength(documents.MAX_DOCUMENTS)
  })

  it('Should derive the controller cap from the manifest, not a copied number', () => {
    expect(documents.MAX_DOCUMENTS).toBe(manifestDocuments.requires.maxEntries)
  })

  it('Should treat a POST without the add action as Continue, appending nothing', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'continue', ...validDocument }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should register the multipart POST route with the 50MB payload cap', () => {
    const server = Hapi.server()
    server.route(documents.routes)
    const route = server.table().find((entry) => entry.method === 'post')
    expect(route.settings.payload.maxBytes).toBe(MAX_PAYLOAD_BYTES)
    expect(route.settings.payload.multipart).toEqual({ output: 'annotated' })
  })
})
