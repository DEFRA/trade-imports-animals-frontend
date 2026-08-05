import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import * as state from '../../../../../../engine/index.js'
import { store } from '../../../../../../engine/store.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import { BackendRequestError } from '../../../../../../services/persistence/records/errors.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { documentUploads } from '../../../../services/document-uploads/index.js'
import { records } from '../../../../services/records/stub.js'
import { documentTypeOptions } from '../../../../services/reference/document-types.js'
import { MAX_DOCUMENTS } from './contracts/max-documents.js'
import { UPLOAD_ID_PATTERN } from './contracts/upload-id.js'
import * as documents from './controller.js'
import { copy } from './copy/copy.en.js'
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_FILE_TYPES_HINT,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL
} from './upload-config.js'

const get = documents.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(documents)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const filePart = ({
  filename = 'phyto.pdf',
  contentType = 'application/pdf',
  length = 2048
} = {}) => ({
  filename,
  headers: { 'content-type': contentType },
  payload: { length }
})

const validPayload = (overrides = {}) => ({
  action: 'add',
  documentType: 'PHYTOSANITARY_CERTIFICATE',
  documentReference: 'PHYTO-001',
  issueDate: '4/12/2025',
  ...overrides
})

const document = (
  reference,
  type = 'PHYTOSANITARY_CERTIFICATE',
  extra = {}
) => ({
  documentType: type,
  documentReference: reference,
  issueDate: { day: '4', month: '12', year: '2025' },
  ...extra
})

// The upload service is the boundary here: an upload has to exist before a
// seeded row can name it, and a scan only settles once something asks for a
// fresh read.
const uploadedFile = async (filename = 'phyto.pdf') =>
  documentUploads.upload({ journeyId: 'seeded-journey', filename })

const settleScan = (uploadId, filename) =>
  documentUploads.scanStatus({ uploadId, filename, refresh: true })

const seededDocument = async (reference, filename = 'phyto.pdf') => {
  const uploadId = await uploadedFile(filename)
  return {
    uploadId,
    entry: document(reference, 'PHYTOSANITARY_CERTIFICATE', {
      uploadId,
      filename
    })
  }
}

// The retry path only honours an upload the backend agrees belongs to this
// journey, so the journey has to exist before the upload is created against it.
const journeyOwningUpload = async (filename = 'phyto.pdf') => {
  const { journeyId } = await withSetContext('plant-products', () =>
    store.create()
  )
  const uploadId = await documentUploads.upload({ journeyId, filename })
  return { journeyId, uploadId }
}

const phytoRow = (status, { uploadId, scanStatus }) => ({
  documentType: 'Phytosanitary certificate',
  documentReference: 'PHYTO-001',
  issueDate: '4/12/2025',
  status,
  uploadId,
  scanStatus,
  viewFileHref: null,
  viewFileHidden: 'Phytosanitary certificate PHYTO-001',
  removeAction: 'remove:0',
  removeHidden: 'Phytosanitary certificate PHYTO-001'
})

const summaryTexts = (result) =>
  (result.view.context.errorSummary?.errorList ?? []).map(({ text }) => text)

describe('plant-products accompanying-documents controller', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    await records.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('renders a blank entry form with the shipped 16 document types', async () => {
    const result = await drive(get)

    expect(result.view.context.values).toEqual({
      documentType: '',
      documentReference: '',
      issueDate: ''
    })
    expect(result.view.context.rows).toEqual([])
    expect(result.view.context.documentTypeItems).toHaveLength(17)
    expect(result.view.context.documentTypeItems.slice(1)).toEqual(
      documentTypeOptions.map((option) => ({ ...option, selected: false }))
    )
  })

  it('offers the file input with the accept attribute and an optional-file hint', async () => {
    const result = await drive(get)

    expect(result.view.context.acceptAttribute).toBe(ACCEPT_ATTRIBUTE)
    expect(result.view.context.fileHint).toBe(
      copy.hints.file(ALLOWED_FILE_TYPES_HINT, MAX_FILE_SIZE_LABEL)
    )
  })

  it('supplies the localised presentation the browser applies to a settled row', async () => {
    const result = await drive(get)

    expect(JSON.parse(result.view.context.scanCopyJson)).toEqual({
      PENDING: { text: copy.status.checking, classes: 'govuk-tag--blue' },
      COMPLETE: {
        text: copy.status.safe,
        classes: 'govuk-tag--green',
        announcement: copy.announcements.safe
      },
      REJECTED: {
        text: copy.status.virus,
        classes: 'govuk-tag--red',
        announcement: copy.announcements.virus
      },
      UNAVAILABLE: {
        text: copy.status.unavailable,
        classes: 'govuk-tag--grey',
        announcement: copy.announcements.unavailable
      },
      UNKNOWN: {
        text: copy.status.unavailable,
        classes: 'govuk-tag--grey',
        announcement: copy.announcements.unavailable
      }
    })
  })

  it('shows a fresh upload as checking and a fileless row as an absence', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    const result = await drive(get, {
      seed: {
        accompanyingDocuments: [
          uploaded.entry,
          document('AIR-002', 'AIR_WAYBILL')
        ]
      }
    })

    expect(result.view.context.rows).toEqual([
      {
        documentType: 'Phytosanitary certificate',
        documentReference: 'PHYTO-001',
        issueDate: '4/12/2025',
        status: { text: 'Checking', classes: 'govuk-tag--blue', tag: true },
        uploadId: uploaded.uploadId,
        scanStatus: 'PENDING',
        viewFileHref: null,
        viewFileHidden: 'Phytosanitary certificate PHYTO-001',
        removeAction: 'remove:0',
        removeHidden: 'Phytosanitary certificate PHYTO-001'
      },
      {
        documentType: 'Air waybill',
        documentReference: 'AIR-002',
        issueDate: '4/12/2025',
        status: { text: 'No file', tag: false },
        uploadId: null,
        scanStatus: 'NO_FILE',
        viewFileHref: null,
        viewFileHidden: 'Air waybill AIR-002',
        removeAction: 'remove:1',
        removeHidden: 'Air waybill AIR-002'
      }
    ])
  })

  it('asks for a fresh scan status when the refresh link supplies an attempt', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    const result = await drive(get, {
      seed: { accompanyingDocuments: [uploaded.entry] },
      query: { attempt: '1' }
    })

    expect(result.view.context.rows[0].status).toEqual({
      text: 'Safe',
      classes: 'govuk-tag--green',
      tag: true
    })
    expect(result.view.context.refreshHref).toMatch(/attempt=2$/)
  })

  it('offers a View file href only once the scan has settled clean', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    const seed = { accompanyingDocuments: [uploaded.entry] }

    const checking = await drive(get, { seed })
    expect(checking.view.context.rows[0].viewFileHref).toBeNull()

    await settleScan(uploaded.uploadId, 'phyto.pdf')
    const safe = await drive(get, { seed })

    expect(safe.view.context.rows[0].viewFileHref).toBe(
      `/plant-products/notifications/${safe.journeyId}/accompanying-documents/${uploaded.uploadId}/file`
    )
    expect(safe.view.context.rows[0].viewFileHidden).toBe(
      'Phytosanitary certificate PHYTO-001'
    )
  })

  it.each([
    { name: 'an infected file', filename: 'virus.pdf' },
    { name: 'a file that never settles', filename: 'never-scans.pdf' }
  ])('offers no View file href for $name', async ({ filename }) => {
    const uploaded = await seededDocument('PHYTO-001', filename)
    await settleScan(uploaded.uploadId, filename)

    const result = await drive(get, {
      seed: { accompanyingDocuments: [uploaded.entry] }
    })

    expect(result.view.context.rows[0].viewFileHref).toBeNull()
  })

  it('offers no View file href for a row that never reached an upload', async () => {
    const result = await drive(get, {
      seed: { accompanyingDocuments: [document('AIR-002', 'AIR_WAYBILL')] }
    })

    expect(result.view.context.rows[0].viewFileHref).toBeNull()
  })

  it('falls closed to checking when the scan status cannot be read', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    vi.spyOn(documentUploads, 'scanStatus').mockRejectedValue(
      new Error('backend down')
    )

    const result = await drive(get, {
      seed: { accompanyingDocuments: [uploaded.entry] }
    })

    expect(result.view.context.rows).toEqual([
      phytoRow(
        { text: 'Checking', classes: 'govuk-tag--blue', tag: true },
        { uploadId: uploaded.uploadId, scanStatus: 'PENDING' }
      )
    ])
  })

  it('offers a recoverable status-unavailable row past the attempt ceiling', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    vi.spyOn(documentUploads, 'scanStatus').mockRejectedValue(
      new Error('backend down')
    )

    const result = await drive(get, {
      seed: { accompanyingDocuments: [uploaded.entry] },
      query: { attempt: '10' }
    })

    expect(result.view.context.rows).toEqual([
      phytoRow(
        {
          text: 'Status unavailable',
          classes: 'govuk-tag--grey',
          tag: true
        },
        { uploadId: uploaded.uploadId, scanStatus: 'UNAVAILABLE' }
      )
    ])
    expect(result.view.context.canRefresh).toBe(true)
    expect(result.view.context.refreshHref).toMatch(/attempt=11$/)
  })

  it('appends the cleaned metadata without a file and redirects to a fresh form', async () => {
    const result = await drive(post, {
      payload: validPayload({
        documentType: ' PHYTOSANITARY_CERTIFICATE ',
        documentReference: ' PHYTO-001 ',
        issueDate: ' 4/12/2025 '
      })
    })

    expect(result.after).toEqual({
      accompanyingDocuments: [document('PHYTO-001')]
    })
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/accompanying-documents$/
    )
  })

  it('uploads the file then persists the upload identity alongside the metadata', async () => {
    const result = await drive(post, {
      payload: validPayload({ file: filePart() })
    })

    const [entry] = result.after.accompanyingDocuments
    expect(entry).toMatchObject({
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      documentReference: 'PHYTO-001',
      issueDate: { day: '4', month: '12', year: '2025' },
      filename: 'phyto.pdf'
    })
    expect(entry.uploadId).toMatch(UPLOAD_ID_PATTERN)
    await expect(
      documentUploads.scanStatus({ uploadId: entry.uploadId })
    ).resolves.toBe('PENDING')
  })

  it.each([
    {
      name: 'requires a document type',
      overrides: { documentType: '' },
      field: 'documentType',
      message: copy.errors.documentTypeRequired,
      raw: ''
    },
    {
      name: 'rejects a type outside the reference allowlist',
      overrides: { documentType: 'FORGED_TYPE' },
      field: 'documentType',
      message: copy.errors.documentTypeRequired,
      raw: 'FORGED_TYPE'
    },
    {
      name: 'requires a document reference',
      overrides: { documentReference: '' },
      field: 'documentReference',
      message: copy.errors.referenceRequired,
      raw: ''
    },
    {
      name: 'caps a document reference at 100 characters',
      overrides: { documentReference: 'x'.repeat(101) },
      field: 'documentReference',
      message: copy.errors.referenceMaxLength,
      raw: 'x'.repeat(101)
    },
    {
      name: 'requires a date of issue',
      overrides: { issueDate: '' },
      field: 'issueDate',
      message: copy.errors.dateRequired,
      raw: ''
    },
    {
      name: 'rejects an impossible calendar date',
      overrides: { issueDate: '31/2/2025' },
      field: 'issueDate',
      message: copy.errors.dateInvalid,
      raw: '31/2/2025'
    }
  ])('$name, preserves raw values and commits nothing', async (testCase) => {
    const payload = validPayload(testCase.overrides)
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors[testCase.field]).toBe(testCase.message)
    expect(result.view.context.values[testCase.field]).toBe(testCase.raw)
    expect(result.after).toEqual({})
  })

  it.each([
    {
      name: 'a disallowed extension',
      file: filePart({ filename: 'notes.zip' }),
      message: copy.errors.fileType(ALLOWED_FILE_TYPES_HINT)
    },
    {
      name: 'an empty file',
      file: filePart({ length: 0 }),
      message: copy.errors.fileEmpty
    },
    {
      name: 'a file over the limit',
      file: filePart({ length: MAX_FILE_SIZE_BYTES + 1 }),
      message: copy.errors.oversize(MAX_FILE_SIZE_LABEL)
    }
  ])(
    'refuses $name at 400, keeps the typed metadata and uploads nothing',
    async ({ file, message }) => {
      const upload = vi.spyOn(documentUploads, 'upload')
      const result = await drive(post, { payload: validPayload({ file }) })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors.file).toBe(message)
      expect(result.view.context.values).toEqual({
        documentType: 'PHYTOSANITARY_CERTIFICATE',
        documentReference: 'PHYTO-001',
        issueDate: '4/12/2025'
      })
      expect(upload).not.toHaveBeenCalled()
      expect(result.after).toEqual({})
    }
  )

  it('accepts a file that is exactly at the limit', async () => {
    const result = await drive(post, {
      payload: validPayload({ file: filePart({ length: MAX_FILE_SIZE_BYTES }) })
    })

    expect(result.view).toBeUndefined()
    expect(result.after.accompanyingDocuments[0].uploadId).toMatch(
      UPLOAD_ID_PATTERN
    )
  })

  it('rewrites a route-level payload rejection into a linked 400, never a bare 413', async () => {
    const oversizeRejection = (request, h) =>
      documents.handleOversizePayload(
        {
          ...request,
          response: { isBoom: true, output: { statusCode: 413 } },
          server: { plugins: { crumb: { generate: () => 'generated-crumb' } } }
        },
        h
      )

    const result = await drive(oversizeRejection)

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.file).toBe(
      copy.errors.oversize(MAX_FILE_SIZE_LABEL)
    )
    expect(result.view.context.crumb).toBe('generated-crumb')
    expect(summaryTexts(result)).toContain(
      copy.errors.oversize(MAX_FILE_SIZE_LABEL)
    )
  })

  it('leaves a response that is not an oversize rejection alone', async () => {
    const otherResponse = (request, h) =>
      documents.handleOversizePayload({ ...request, response: {} }, h)

    const result = await drive(otherResponse)

    expect(result.view).toBeUndefined()
  })

  it('renders the canonical upload-failure sentence when the upload fails', async () => {
    vi.spyOn(documentUploads, 'upload').mockRejectedValue(
      new Error('cdp-uploader unreachable')
    )

    const result = await drive(post, {
      payload: validPayload({ file: filePart() })
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.errors.file).toBe(
      'The file could not be uploaded. Try again.'
    )
    expect(result.after).toEqual({})
  })

  it('refuses a retry upload that belongs to another journey and persists nothing', async () => {
    const foreign = await uploadedFile('someone-elses.pdf')

    const result = await drive(post, {
      payload: validPayload({
        retryUploadId: foreign,
        retryFilename: 'someone-elses.pdf'
      })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.file).toBe(copy.errors.uploadFailed)
    expect(result.after).toEqual({})
  })

  it('reuses a verified retry upload rather than creating a second one', async () => {
    const { journeyId, uploadId } = await journeyOwningUpload()

    const result = await drive(post, {
      journeyId,
      payload: validPayload({
        retryUploadId: uploadId,
        retryFilename: 'phyto.pdf'
      })
    })

    expect(result.after.accompanyingDocuments).toEqual([
      document('PHYTO-001', 'PHYTOSANITARY_CERTIFICATE', {
        uploadId,
        filename: 'phyto.pdf'
      })
    ])
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/accompanying-documents$/
    )
  })

  it('does not append a second row when the retried upload already landed', async () => {
    const { journeyId, uploadId } = await journeyOwningUpload()
    const landed = document('PHYTO-001', 'PHYTOSANITARY_CERTIFICATE', {
      uploadId,
      filename: 'phyto.pdf'
    })

    const result = await drive(post, {
      journeyId,
      seed: { accompanyingDocuments: [landed] },
      payload: validPayload({
        retryUploadId: uploadId,
        retryFilename: 'phyto.pdf'
      })
    })

    expect(result.after.accompanyingDocuments).toEqual([landed])
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/accompanying-documents$/
    )
  })

  it('refuses a verified retry that would push the page past the maximum', async () => {
    const { journeyId, uploadId } = await journeyOwningUpload()
    const seed = {
      accompanyingDocuments: Array.from({ length: MAX_DOCUMENTS }, (_, index) =>
        document(`PHYTO-${index}`)
      )
    }

    const result = await drive(post, {
      journeyId,
      seed,
      payload: validPayload({
        retryUploadId: uploadId,
        retryFilename: 'phyto.pdf'
      })
    })

    expect(result.response.statusCode).toBe(400)
    expect(summaryTexts(result)).toContain(
      copy.errors.maxDocuments(MAX_DOCUMENTS)
    )
    expect(result.after).toEqual(seed)
  })

  it.each([
    { name: 'a disallowed extension', retryFilename: 'invoice.exe' },
    { name: 'a crafted non-string part', retryFilename: { filename: 'x.pdf' } }
  ])(
    'refuses a retry filename carrying $name and persists nothing',
    async ({ retryFilename }) => {
      const { journeyId, uploadId } = await journeyOwningUpload()

      const result = await drive(post, {
        journeyId,
        payload: validPayload({ retryUploadId: uploadId, retryFilename })
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors.file).toBe(copy.errors.uploadFailed)
      expect(result.after).toEqual({})
    }
  )

  it('removes the middle document so renumbered indices cannot hide the target', async () => {
    const first = document('PHYTO-001')
    const middle = document('AIR-002', 'AIR_WAYBILL')
    const last = document('INVOICE-003', 'COMMERCIAL_INVOICE')
    const result = await drive(post, {
      seed: { accompanyingDocuments: [first, middle, last] },
      payload: { action: 'remove:1' }
    })

    expect(result.after.accompanyingDocuments).toEqual([first, last])
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/accompanying-documents$/
    )
  })

  it('deletes the upload session before dropping a row that carries a file', async () => {
    const uploaded = await seededDocument('PHYTO-001')

    const result = await drive(post, {
      seed: { accompanyingDocuments: [uploaded.entry] },
      payload: { action: 'remove:0' }
    })

    expect(result.after.accompanyingDocuments).toBeUndefined()
    await expect(
      documentUploads.scanStatus({ uploadId: uploaded.uploadId })
    ).rejects.toMatchObject({ status: 404 })
  })

  it('renders a recoverable error instead of redirecting when the upload delete fails', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    const seed = { accompanyingDocuments: [uploaded.entry] }
    vi.spyOn(documentUploads, 'remove').mockRejectedValue(
      new Error('backend unreachable')
    )

    const result = await drive(post, { seed, payload: { action: 'remove:0' } })

    expect(result.response.statusCode).toBe(500)
    expect(summaryTexts(result)).toContain(copy.errors.removeFailed)
    expect(result.after).toEqual(seed)
  })

  it('recovers a failed row write after the upload is gone so a re-issued remove clears it', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    const seed = { accompanyingDocuments: [uploaded.entry] }
    vi.spyOn(state, 'removeEntry').mockRejectedValueOnce(
      new BackendRequestError('remove entry', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const failed = await drive(post, { seed, payload: { action: 'remove:0' } })

    expect(failed.response.statusCode).toBe(500)
    expect(summaryTexts(failed)).toContain(copy.errors.removeFailed)
    expect(failed.after).toEqual(seed)

    const retried = await drive(post, { seed, payload: { action: 'remove:0' } })

    expect(retried.after.accompanyingDocuments).toBeUndefined()
  })

  it.each(['remove:3', 'remove:1.5', 'remove:not-a-number'])(
    'refuses the forged or stale index %s without touching the store',
    async (action) => {
      const seed = { accompanyingDocuments: [document('PHYTO-001')] }
      const result = await drive(post, { seed, payload: { action } })

      expect(result.response.statusCode).toBe(400)
      expect(result.after).toEqual(seed)
    }
  )

  it('refuses an eleventh document with the capacity message', async () => {
    const seed = {
      accompanyingDocuments: Array.from({ length: MAX_DOCUMENTS }, (_, index) =>
        document(`PHYTO-${index}`)
      )
    }

    const result = await drive(post, { seed, payload: validPayload() })

    expect(result.response.statusCode).toBe(400)
    expect(summaryTexts(result)).toContain(
      copy.errors.maxDocuments(MAX_DOCUMENTS)
    )
    expect(result.after.accompanyingDocuments).toHaveLength(MAX_DOCUMENTS)
  })

  it('blocks continue while a file is still being checked', async () => {
    const uploaded = await seededDocument('PHYTO-001')

    const result = await drive(post, {
      seed: { accompanyingDocuments: [uploaded.entry] },
      payload: { action: 'continue' }
    })

    expect(result.response.redirect).toBeUndefined()
    expect(summaryTexts(result)).toEqual([copy.errors.cannotContinue])
  })

  it('names the infected file in the summary and refuses to continue', async () => {
    const uploaded = await seededDocument('PHYTO-001', 'virus.pdf')
    await settleScan(uploaded.uploadId, 'virus.pdf')

    const result = await drive(post, {
      seed: { accompanyingDocuments: [uploaded.entry] },
      payload: { action: 'continue' }
    })

    expect(result.response.redirect).toBeUndefined()
    expect(summaryTexts(result)).toEqual([
      'virus.pdf contains a virus. Remove it and try again with a different file.'
    ])
    expect(result.view.context.canRefresh).toBe(false)
  })

  it('allows continue once the scan is clean', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    await settleScan(uploaded.uploadId, 'phyto.pdf')
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )

    const result = await drive(post, {
      seed: { accompanyingDocuments: [uploaded.entry] },
      payload: { action: 'continue' }
    })

    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
  })

  it('allows continue when the only incomplete rows have no file at all', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )

    const result = await drive(post, {
      seed: { accompanyingDocuments: [document('PHYTO-001')] },
      payload: { action: 'continue' }
    })

    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
  })

  it('continues without validating or writing and honours nextTarget', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const result = await drive(post, { payload: { action: 'continue' } })

    expect(result.after).toEqual({})
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
  })

  it('lets the hub exit win even while a scan is unsettled', async () => {
    const uploaded = await seededDocument('PHYTO-001')

    const result = await drive(post, {
      seed: { accompanyingDocuments: [uploaded.entry] },
      payload: { action: 'continue', exit: 'hub' }
    })

    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
  })

  it('renders raw values, a recoverable error and the pending upload at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validPayload({
      documentReference: ' PHYTO-001 ',
      file: filePart()
    })
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values.documentReference).toBe(' PHYTO-001 ')
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.pendingUpload.filename).toBe('phyto.pdf')
    expect(result.view.context.pendingUpload.uploadId).toMatch(
      UPLOAD_ID_PATTERN
    )
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(drive(post, { payload: validPayload() })).rejects.toThrow(
      'programming failure'
    )
  })
})

describe('plant-products accompanying-documents file download', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(nunjucksConfig)
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
    await server.initialize()
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    await records.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const journeyHolding = (...documents) =>
    withSetContext('plant-products', async () => {
      const { journeyId } = await store.create()
      await store.seedAnswers(journeyId, {
        accompanyingDocuments: documents
      })
      return journeyId
    })

  const readFile = (journeyId, uploadId) =>
    server.inject(
      `/plant-products/notifications/${journeyId}/accompanying-documents/${uploadId}/file`
    )

  const settledDocument = async (reference, filename = 'phyto.pdf') => {
    const uploaded = await seededDocument(reference, filename)
    await settleScan(uploaded.uploadId, filename)
    return uploaded
  }

  it('streams a clean owned file with its content type, disposition and nosniff', async () => {
    const uploaded = await settledDocument('PHYTO-001')
    const journeyId = await journeyHolding(uploaded.entry)

    const response = await readFile(journeyId, uploaded.uploadId)

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/^application\/pdf/)
    expect(response.headers['content-disposition']).toBe(
      'inline; filename="placeholder.pdf"'
    )
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.payload.startsWith('%PDF-')).toBe(true)
  })

  it('serves a type outside the upload allow-list as octet-stream', async () => {
    const uploaded = await settledDocument('PHYTO-001')
    const journeyId = await journeyHolding(uploaded.entry)
    vi.spyOn(documentUploads, 'streamFile').mockResolvedValue(
      new Response('<script>alert(1)</script>', {
        headers: { 'content-type': 'text/html' }
      })
    )

    const response = await readFile(journeyId, uploaded.uploadId)

    expect(response.headers['content-type']).toMatch(
      /^application\/octet-stream/
    )
    expect(response.headers['content-disposition']).toBe('attachment')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('answers 404 while the scan is still checking', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    const journeyId = await journeyHolding(uploaded.entry)

    const response = await readFile(journeyId, uploaded.uploadId)

    expect(response.statusCode).toBe(404)
  })

  it('answers 404 for a file the scan rejected', async () => {
    const uploaded = await settledDocument('PHYTO-INFECTED', 'virus.pdf')
    const journeyId = await journeyHolding(uploaded.entry)

    const response = await readFile(journeyId, uploaded.uploadId)

    expect(response.statusCode).toBe(404)
  })

  it('answers 404 when the journey holds only fileless rows', async () => {
    const uploaded = await settledDocument('PHYTO-001')
    const journeyId = await journeyHolding(document('AIR-002', 'AIR_WAYBILL'))

    const response = await readFile(journeyId, uploaded.uploadId)

    expect(response.statusCode).toBe(404)
  })

  it.each([
    { name: 'a space', encoded: 'up_1234%20', decoded: 'up_1234 ' },
    { name: 'a dot segment', encoded: 'up.1234', decoded: 'up.1234' }
  ])(
    'answers 404 for an id containing $name without asking the upload service',
    async ({ encoded, decoded }) => {
      const journeyId = await journeyHolding(
        document('PHYTO-001', 'PHYTOSANITARY_CERTIFICATE', {
          uploadId: decoded,
          filename: 'phyto.pdf'
        })
      )
      const scanStatus = vi.spyOn(documentUploads, 'scanStatus')
      const streamFile = vi.spyOn(documentUploads, 'streamFile')

      const response = await readFile(journeyId, encoded)

      expect(response.statusCode).toBe(404)
      expect(scanStatus).not.toHaveBeenCalled()
      expect(streamFile).not.toHaveBeenCalled()
    }
  )

  it('never exposes one journey’s file through another journey in the same session', async () => {
    const uploaded = await settledDocument('PHYTO-001')
    const neighbourUpload = await settledDocument('PHYTO-002')
    const holder = await journeyHolding(uploaded.entry)
    const neighbour = await journeyHolding(neighbourUpload.entry)

    await expect(readFile(holder, uploaded.uploadId)).resolves.toMatchObject({
      statusCode: 200
    })
    const response = await readFile(neighbour, uploaded.uploadId)

    expect(response.statusCode).toBe(404)
  })
})

describe('plant-products accompanying-documents scan status feed', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(nunjucksConfig)
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
    await server.initialize()
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    await records.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  // The journey needs one committed answer of its own or the entry guard sends
  // it back to the start before any handler runs.
  const journeyHolding = (...documents) =>
    withSetContext('plant-products', async () => {
      const { journeyId } = await store.create()
      await store.seedAnswers(journeyId, {
        countryOfOrigin: 'FR',
        accompanyingDocuments: documents
      })
      return journeyId
    })

  const readStatus = async (journeyId) => {
    const response = await server.inject(
      `/plant-products/notifications/${journeyId}/accompanying-documents/status`
    )
    return { response, body: JSON.parse(response.payload) }
  }

  it('reports each of this journey’s uploads as an id and a verdict, and nothing else', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    const journeyId = await journeyHolding(uploaded.entry)

    const { response, body } = await readStatus(journeyId)

    expect(response.statusCode).toBe(200)
    expect(body).toEqual({
      documents: [{ uploadId: uploaded.uploadId, scanStatus: 'COMPLETE' }]
    })
  })

  it('asks the upload service for a fresh verdict so a poll settles a checking row', async () => {
    const uploaded = await seededDocument('PHYTO-INFECTED', 'virus.pdf')
    const journeyId = await journeyHolding(uploaded.entry)

    const { body } = await readStatus(journeyId)

    expect(body.documents).toEqual([
      { uploadId: uploaded.uploadId, scanStatus: 'REJECTED' }
    ])
  })

  it('answers an empty collection for a journey holding no documents', async () => {
    const journeyId = await journeyHolding()

    const { response, body } = await readStatus(journeyId)

    expect(response.statusCode).toBe(200)
    expect(body).toEqual({ documents: [] })
  })

  it('omits a fileless row, which has no scan to report', async () => {
    const journeyId = await journeyHolding(document('AIR-002', 'AIR_WAYBILL'))

    const { body } = await readStatus(journeyId)

    expect(body).toEqual({ documents: [] })
  })

  it('never reports an upload belonging to another journey in the same session', async () => {
    const held = await seededDocument('PHYTO-001')
    const neighbourUpload = await seededDocument('PHYTO-002')
    await journeyHolding(neighbourUpload.entry)
    const journeyId = await journeyHolding(held.entry)

    const { body } = await readStatus(journeyId)

    expect(body.documents.map(({ uploadId }) => uploadId)).toEqual([
      held.uploadId
    ])
  })

  it('falls closed to checking rather than settling when the verdict cannot be read', async () => {
    const uploaded = await seededDocument('PHYTO-001')
    const journeyId = await journeyHolding(uploaded.entry)
    vi.spyOn(documentUploads, 'scanStatus').mockRejectedValue(
      new Error('backend down')
    )

    const { body } = await readStatus(journeyId)

    expect(body.documents).toEqual([
      { uploadId: uploaded.uploadId, scanStatus: 'PENDING' }
    ])
  })
})
