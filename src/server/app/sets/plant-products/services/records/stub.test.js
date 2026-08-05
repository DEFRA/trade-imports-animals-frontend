import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assembleFulfilments } from '../../../../bridge/assemble-fulfilments.js'
import { configureFulfilmentRegistry } from '../../../../bridge/fulfilment-registry.js'
import { configureObligationSet } from '../../../../model/obligations/manifest.js'
import {
  registerSetMount,
  withSetContext
} from '../../../../shared/set-context.js'
import { featureEvaluationBindings } from '../../journeys/linear/features/evaluation.js'
import * as plantProductsObligationSet from '../../obligations/index.js'
import {
  accompanyingDocuments,
  documentReference,
  documentType,
  filename,
  issueDate,
  uploadId
} from '../../obligations/sections/documents.js'
import { records } from './stub.js'

const SET_ID = 'plant-products'
const REFERENCE_PATTERN = /^GBN-PP-\d{2}-[0-9A-HJ-KM-NP-TV-Z]{6}$/
const DOCUMENT_LEAF_OBLIGATION_IDS = [
  documentType.id,
  documentReference.id,
  issueDate.id,
  uploadId.id,
  filename.id
]
const DOCUMENT_OBLIGATION_IDS = [
  accompanyingDocuments.id,
  ...DOCUMENT_LEAF_OBLIGATION_IDS
]
const CANNED_CONTENT = {
  origin: {
    countryCode: 'BR',
    internalReference: 'BR-EXPORT-2026-001'
  }
}
const inPlantProducts = (operation) => withSetContext(SET_ID, operation)

registerSetMount(SET_ID, '/plant-products')

const createAtStatus = async (status) => {
  const created = await records.create()
  if (status === 'submitted' || status === 'amend') {
    await records.finalise(created.journeyId)
  }
  if (status === 'amend') {
    await records.amend(created.journeyId)
  }
  return created.journeyId
}

const lifecycleTests = () => {
  it('mints unique references in the backend GBN-PP format', async () => {
    const first = await records.create()
    const second = await records.create()

    expect(first).toEqual({
      journeyId: expect.stringMatching(REFERENCE_PATTERN),
      status: 'draft',
      createdAt: expect.any(String),
      submittedAt: null,
      fulfilment: {}
    })
    expect(second.journeyId).toMatch(REFERENCE_PATTERN)
    expect(second.journeyId).not.toBe(first.journeyId)
  })

  it.each([
    ['finalise', 'submitted'],
    ['amend', 'draft'],
    ['cancelAmend', 'draft'],
    ['replaceFulfilment', 'submitted'],
    ['copy', 'draft']
  ])('rejects %s from an illegal %s state', async (operation, status) => {
    const journeyId = await createAtStatus(status)
    const args =
      operation === 'replaceFulfilment'
        ? [journeyId, CANNED_CONTENT]
        : operation === 'copy'
          ? [journeyId, 'draft-copy-key']
          : [journeyId]

    await expect(records[operation](...args)).rejects.toThrow()
  })

  it('captures the submitted snapshot and restores it when amendment is cancelled', async () => {
    const created = await records.create()
    await records.replaceFulfilment(created.journeyId, CANNED_CONTENT)
    const submitted = await records.finalise(created.journeyId)
    await records.amend(created.journeyId)
    await records.replaceFulfilment(created.journeyId, {
      origin: { countryCode: 'BR', internalReference: 'CANCELLED-AMENDMENT' }
    })

    const restored = await records.cancelAmend(created.journeyId)

    expect(restored).toEqual({
      ...submitted,
      fulfilment: CANNED_CONTENT
    })
  })

  it('pages, filters by exact reference and hides deleted records', () =>
    inPlantProducts(async () => {
      const created = await Promise.all(
        Array.from({ length: 27 }, () => records.create())
      )
      await records.softDelete(created[1].journeyId)

      const firstPage = await records.list({ page: 1 })
      const secondPage = await records.list({ page: 2 })
      const filtered = await records.list({
        referenceNumber: created[26].journeyId
      })

      expect(firstPage).toMatchObject({
        page: 1,
        size: 25,
        totalElements: 26,
        totalPages: 2
      })
      expect(firstPage.rows).toHaveLength(25)
      expect(secondPage.rows).toHaveLength(1)
      expect(filtered.rows.map(({ journeyId }) => journeyId)).toEqual([
        created[26].journeyId
      ])
      expect(
        [...firstPage.rows, ...secondPage.rows].map(
          ({ journeyId }) => journeyId
        )
      ).not.toContain(created[1].journeyId)
    }))

  it('projects dashboard facts and applies the supported sort tokens', () =>
    withSetContext(SET_ID, async () => {
      const first = await records.create()
      const second = await records.create()
      await records.replaceFulfilment(
        first.journeyId,
        assembleFulfilments({
          countryOfOrigin: 'IE',
          arrivalDate: '2026-03-07'
        })
      )
      await records.replaceFulfilment(
        second.journeyId,
        assembleFulfilments({
          countryOfOrigin: 'FR',
          arrivalDate: '2026-03-08'
        })
      )

      const descending = await records.list({ sort: 'arrivalDate,desc' })
      const ascending = await records.list({ sort: 'arrivalDate,asc' })

      expect(descending.rows.map(({ journeyId }) => journeyId)).toEqual([
        second.journeyId,
        first.journeyId
      ])
      expect(ascending.rows.map(({ journeyId }) => journeyId)).toEqual([
        first.journeyId,
        second.journeyId
      ])
      expect(descending.rows[1]).toMatchObject({
        originCountryCode: 'IE',
        arrivalDate: '2026-03-07'
      })
    }))
}

const copyTests = () => {
  it.each([undefined, null, '', '   '])(
    'rejects a blank copy key before creating a draft (%s)',
    (key) =>
      inPlantProducts(async () => {
        const source = await records.create()
        await records.finalise(source.journeyId)

        await expect(records.copy(source.journeyId, key)).rejects.toThrow(
          'Idempotency-Key must not be blank'
        )
        expect((await records.list()).rows).toHaveLength(1)
      })
  )

  it('returns one draft when the same source and key are copied twice', () =>
    inPlantProducts(async () => {
      const source = await records.create()
      await records.finalise(source.journeyId)

      const first = await records.copy(source.journeyId, 'same-copy-key')
      const repeated = await records.copy(source.journeyId, 'same-copy-key')

      expect(repeated.journeyId).toBe(first.journeyId)
      expect((await records.list()).rows).toHaveLength(2)
    }))

  it('mints separate drafts for different idempotency keys', () =>
    inPlantProducts(async () => {
      const source = await records.create()
      await records.finalise(source.journeyId)

      const first = await records.copy(source.journeyId, 'first-copy-key')
      const second = await records.copy(source.journeyId, 'second-copy-key')

      expect(second.journeyId).not.toBe(first.journeyId)
      expect((await records.list()).rows).toHaveLength(3)
    }))

  it('matches the backend global key index when a key is reused for another source', () =>
    inPlantProducts(async () => {
      const firstSource = await records.create()
      const secondSource = await records.create()
      await records.finalise(firstSource.journeyId)
      await records.finalise(secondSource.journeyId)

      const first = await records.copy(firstSource.journeyId, 'scoped-key')
      const repeated = await records.copy(secondSource.journeyId, 'scoped-key')

      expect(repeated.journeyId).toBe(first.journeyId)
      expect((await records.list()).rows).toHaveLength(3)
    }))

  it('copies fulfilment by value without sharing mutable state', async () => {
    const source = await records.create()
    await records.replaceFulfilment(source.journeyId, CANNED_CONTENT)
    await records.finalise(source.journeyId)

    const copied = await records.copy(source.journeyId, 'content-copy-key')
    copied.fulfilment.origin.internalReference = 'MUTATED-RETURN-VALUE'
    await records.replaceFulfilment(copied.journeyId, {
      origin: { countryCode: 'BR', internalReference: 'COPY-ONLY-CHANGE' }
    })

    expect(
      (await records.load({ journeyId: source.journeyId })).fulfilment
    ).toEqual(CANNED_CONTENT)
  })

  it('copies notification content without accompanying documents', () =>
    withSetContext(SET_ID, async () => {
      const source = await records.create()
      await records.replaceFulfilment(
        source.journeyId,
        assembleFulfilments({
          countryOfOrigin: 'BR',
          accompanyingDocuments: [
            {
              documentType: 'PHYTOSANITARY_CERTIFICATE',
              documentReference: 'PHYTO-DOCUMENTLESS-045',
              issueDate: { day: '4', month: '8', year: '2026' },
              uploadId: 'upload-abc-123',
              filename: 'phyto.pdf'
            }
          ]
        })
      )
      const submitted = await records.finalise(source.journeyId)

      const copied = await records.copy(
        source.journeyId,
        'documentless-copy-key'
      )

      expect(Object.keys(submitted.fulfilment)).toEqual(
        expect.arrayContaining(DOCUMENT_LEAF_OBLIGATION_IDS)
      )
      expect(
        DOCUMENT_OBLIGATION_IDS.filter((id) =>
          Object.hasOwn(copied.fulfilment, id)
        )
      ).toEqual([])
    }))

  it('clear resets both the record store and the idempotency index', () =>
    inPlantProducts(async () => {
      const firstSource = await records.create()
      await records.finalise(firstSource.journeyId)
      const firstCopy = await records.copy(
        firstSource.journeyId,
        'reusable-key'
      )

      await records.clear()

      const secondSource = await records.create()
      await records.finalise(secondSource.journeyId)
      const secondCopy = await records.copy(
        secondSource.journeyId,
        'reusable-key'
      )

      expect(await records.has(firstCopy.journeyId)).toBe(false)
      expect(secondCopy.journeyId).not.toBe(firstCopy.journeyId)
      expect((await records.list()).rows).toHaveLength(2)
    }))
}

const modeSelectionTests = () => {
  it('selects real mode at module load when the mode variable is real', async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'real')
    vi.resetModules()
    const { records: selectedRecords } = await import('./index.js')

    await expect(selectedRecords.clear()).rejects.toThrow(
      'records.clear is not supported in real mode'
    )
  })
}

describe('plant-products records stub', () => {
  beforeEach(async () => {
    configureObligationSet(SET_ID, plantProductsObligationSet)
    configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
    await inPlantProducts(() => records.clear())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  lifecycleTests()
  copyTests()
  modeSelectionTests()
})
