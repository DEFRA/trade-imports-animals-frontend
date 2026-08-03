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

import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { records } from '../../../../services/records/stub.js'
import { documentTypeOptions } from '../../../../services/reference/document-types.js'
import * as documents from './controller.js'
import { copy } from './copy/copy.en.js'

const get = documents.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(documents)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const validPayload = (overrides = {}) => ({
  action: 'add',
  documentType: 'PHYTOSANITARY_CERTIFICATE',
  documentReference: 'PHYTO-001',
  issueDate: '4/12/2025',
  ...overrides
})

const document = (reference, type = 'PHYTOSANITARY_CERTIFICATE') => ({
  documentType: type,
  documentReference: reference,
  issueDate: { day: '4', month: '12', year: '2025' }
})

describe('plant-products accompanying-documents controller', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
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
    vi.unstubAllEnvs()
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

  it('renders saved documents with reference labels and answer dates', async () => {
    const result = await drive(get, {
      seed: {
        accompanyingDocuments: [
          document('PHYTO-001'),
          document('AIR-002', 'AIR_WAYBILL')
        ]
      }
    })

    expect(result.view.context.rows).toEqual([
      {
        index: 0,
        documentType: 'Phytosanitary certificate',
        documentReference: 'PHYTO-001',
        issueDate: '4/12/2025'
      },
      {
        index: 1,
        documentType: 'Air waybill',
        documentReference: 'AIR-002',
        issueDate: '4/12/2025'
      }
    ])
  })

  it('appends exactly the cleaned document metadata and redirects to a fresh form', async () => {
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
    expect(result.view.context.values).toEqual({
      documentType: payload.documentType,
      documentReference: payload.documentReference,
      issueDate: payload.issueDate
    })
    expect(result.after).toEqual({})
  })

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

  it.each(['remove:3', 'remove:1.5', 'remove:not-a-number'])(
    'refuses the forged or stale index %s without touching the store',
    async (action) => {
      const seed = { accompanyingDocuments: [document('PHYTO-001')] }
      const result = await drive(post, { seed, payload: { action } })

      expect(result.response.statusCode).toBe(400)
      expect(result.after).toEqual(seed)
    }
  )

  it('continues without validating or writing and honours nextTarget', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, { payload: { action: 'continue' } })

    expect(result.after).toEqual({})
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('lets the hub exit win without calling nextTarget', async () => {
    const nextTarget = vi.spyOn(kit, 'nextTarget')
    const result = await drive(post, {
      payload: { action: 'continue', exit: 'hub' }
    })

    expect(result.after).toEqual({})
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
    expect(nextTarget).not.toHaveBeenCalled()
  })

  it('renders raw values and a recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validPayload({ documentReference: ' PHYTO-001 ' })
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values.documentReference).toBe(' PHYTO-001 ')
    expect(result.view.context.recoverableError).toBe(true)
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
