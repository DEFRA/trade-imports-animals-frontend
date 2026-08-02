import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { configureFulfilmentRegistry } from '../../../../bridge/fulfilment-registry.js'
import { configureObligationSet } from '../../../../model/obligations/manifest.js'
import { withSetContext } from '../../../../shared/set-context.js'
import * as plantProductsObligationSet from '../../obligations/index.js'
import { featureEvaluationBindings } from '../../journeys/linear/features/evaluation.js'
import { IDEMPOTENCY_KEY_HEADER, notificationsUrl } from './config.js'
import { records as realRecords } from './real.js'
import { records as stubRecords } from './stub.js'

// The real implementation is exercised through a stateful network-boundary
// mock. Production dedupe is enforced by the backend's unique partial index;
// the adapter's responsibility is to send the key verbatim on every request
// and trust the returned notification.
const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const SET_ID = 'plant-products'
const CREATED_AT = '2026-08-01T10:00:00'
const DECLARED_AT = '2026-08-01T12:00:00'
const CANNED_REFERENCES = [
  'GBN-PP-26-ABC001',
  'GBN-PP-26-IDX001',
  'GBN-PP-26-IDX002',
  'GBN-PP-26-IDX003',
  'GBN-PP-26-IDX004'
]

configureObligationSet(SET_ID, plantProductsObligationSet)
configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)

const inPlantProducts = (operation) => withSetContext(SET_ID, operation)

const jsonResponse = (body, status = 200) => ({
  body: JSON.stringify(body),
  status
})

const createNetworkBackend = () => {
  const notifications = new Map()
  const copiesByKey = new Map()
  let nextReference = 0

  const mint = () => CANNED_REFERENCES[nextReference++]
  const saveDraft = (referenceNumber = mint()) => {
    const notification = {
      referenceNumber,
      status: 'DRAFT',
      created: CREATED_AT
    }
    notifications.set(referenceNumber, notification)
    return notification
  }

  const responseFor = async (request) => {
    const url = new URL(request.url)
    const relativePath = url.pathname.slice(
      new URL(notificationsUrl).pathname.length
    )
    const parts = relativePath.split('/').filter(Boolean)

    if (parts.length === 0 && request.method === 'POST') {
      return jsonResponse(saveDraft(), 201)
    }
    if (parts.length === 0 && request.method === 'GET') {
      const content = [...notifications.values()].filter(
        ({ status }) => status !== 'DELETED'
      )
      return jsonResponse({
        content,
        page: Number(url.searchParams.get('page') ?? 1),
        pageSize: 25,
        totalElements: content.length,
        totalPages: content.length === 0 ? 0 : 1
      })
    }

    const [referenceNumber, subresource] = parts
    const notification = notifications.get(referenceNumber)
    if (request.method === 'GET' && parts.length === 1) {
      return notification === undefined
        ? { body: '', status: 404 }
        : jsonResponse(notification)
    }
    if (request.method === 'PUT' && parts.length === 1) {
      if (notification === undefined) return { body: '', status: 404 }
      const body = await request.clone().json()
      const replaced = { ...notification, ...body }
      notifications.set(referenceNumber, replaced)
      return jsonResponse(replaced)
    }
    if (request.method === 'PUT' && subresource === 'status') {
      if (notification === undefined) return { body: '', status: 404 }
      const { status, discardChanges } = await request.clone().json()
      if (status === 'AMEND') {
        notification.submittedSnapshot = structuredClone(notification)
        notification.status = 'AMEND'
      } else if (status === 'SUBMITTED' && discardChanges) {
        Object.assign(notification, notification.submittedSnapshot)
        delete notification.submittedSnapshot
        notification.status = 'SUBMITTED'
      } else if (status === 'SUBMITTED') {
        notification.status = 'SUBMITTED'
        notification.declaration = { declaredAt: DECLARED_AT }
        delete notification.submittedSnapshot
      } else if (status === 'DELETED') {
        notification.status = 'DELETED'
      }
      return jsonResponse(notification)
    }
    if (request.method === 'POST' && subresource === 'copies') {
      const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)
      const existingReference = copiesByKey.get(key)
      if (existingReference !== undefined) {
        return jsonResponse(notifications.get(existingReference), 201)
      }
      if (
        notification === undefined ||
        !['SUBMITTED', 'AMEND'].includes(notification.status)
      ) {
        return { body: '', status: notification === undefined ? 404 : 400 }
      }
      const copied = saveDraft()
      copiesByKey.set(key, copied.referenceNumber)
      return jsonResponse(copied, 201)
    }
    return { body: '', status: 404 }
  }

  return {
    reset() {
      notifications.clear()
      copiesByKey.clear()
      nextReference = 0
      fetchMocker.resetMocks()
      fetchMocker.mockResponse(responseFor)
    }
  }
}

const networkBackend = createNetworkBackend()

const implementations = [
  {
    name: 'stub',
    records: stubRecords,
    reset: async () => {
      fetchMocker.resetMocks()
      await stubRecords.clear()
    }
  },
  {
    name: 'real HTTP adapter',
    records: realRecords,
    reset: async () => networkBackend.reset()
  }
]

describe.each(implementations)(
  'plant-products records engine port — $name',
  ({ name, records, reset }) => {
    beforeEach(reset)

    it('creates a draft journey in the engine record shape', async () => {
      const created = await inPlantProducts(() => records.create())

      expect(created).toEqual({
        journeyId: expect.stringMatching(
          /^GBN-PP-\d{2}-[0-9A-HJ-KM-NP-TV-Z]{6}$/
        ),
        status: 'draft',
        createdAt: expect.any(String),
        submittedAt: null,
        fulfilment: {}
      })
    })

    it('loads a whole-replaced m0 fulfilment and reports presence', async () => {
      const created = await inPlantProducts(() => records.create())
      await inPlantProducts(() =>
        records.replaceFulfilment(created.journeyId, {}, { known: created })
      )

      await expect(
        inPlantProducts(() => records.load({ journeyId: created.journeyId }))
      ).resolves.toMatchObject({
        journeyId: created.journeyId,
        fulfilment: {}
      })
      await expect(
        inPlantProducts(() => records.has(created.journeyId))
      ).resolves.toBe(true)
      await expect(
        inPlantProducts(() => records.has('GBN-PP-00-000000'))
      ).resolves.toBe(false)
    })

    it('submits, amends, cancels and soft-deletes idempotently', async () => {
      const created = await inPlantProducts(() => records.create())
      const submitted = await inPlantProducts(() =>
        records.finalise(created.journeyId)
      )
      const amending = await inPlantProducts(() =>
        records.amend(created.journeyId)
      )
      const restored = await inPlantProducts(() =>
        records.cancelAmend(created.journeyId)
      )
      const deleted = await inPlantProducts(() =>
        records.softDelete(created.journeyId)
      )
      const repeatedDelete = await inPlantProducts(() =>
        records.softDelete(created.journeyId)
      )

      expect(submitted.status).toBe('submitted')
      expect(amending.status).toBe('amend')
      expect(restored).toMatchObject({ status: 'submitted', fulfilment: {} })
      expect(deleted.status).toBe('deleted')
      expect(repeatedDelete.status).toBe('deleted')
    })

    it('rejects replacement after submission', async () => {
      const created = await inPlantProducts(() => records.create())
      await inPlantProducts(() => records.finalise(created.journeyId))

      await expect(
        inPlantProducts(() =>
          records.replaceFulfilment(
            created.journeyId,
            {},
            { known: { ...created, status: 'submitted' } }
          )
        )
      ).rejects.toThrow('is submitted — writes blocked')
    })

    it('returns one new draft per idempotency key', async () => {
      const source = await inPlantProducts(() => records.create())
      await inPlantProducts(() => records.finalise(source.journeyId))

      const first = await inPlantProducts(() =>
        records.copy(source.journeyId, 'same-copy-key')
      )
      const repeated = await inPlantProducts(() =>
        records.copy(source.journeyId, 'same-copy-key')
      )

      const afterRepeat = await inPlantProducts(() => records.list())

      expect(repeated.journeyId).toBe(first.journeyId)
      expect(
        afterRepeat.rows
          .filter(({ status }) => status === 'draft')
          .map(({ journeyId }) => journeyId)
      ).toEqual([first.journeyId])

      const deliberateSecond = await inPlantProducts(() =>
        records.copy(source.journeyId, 'second-copy-key')
      )

      const afterSecondKey = await inPlantProducts(() => records.list())

      expect(deliberateSecond.journeyId).not.toBe(first.journeyId)
      expect(first).toMatchObject({ status: 'draft', fulfilment: {} })
      expect(
        afterSecondKey.rows.filter(({ status }) => status === 'draft')
      ).toHaveLength(2)

      if (name === 'real HTTP adapter') {
        const copyRequests = fetchMocker
          .requests()
          .filter(({ url }) => url.endsWith('/copies'))
        expect(copyRequests).toHaveLength(3)
        expect(
          copyRequests.map((request) =>
            request.headers.get(IDEMPOTENCY_KEY_HEADER)
          )
        ).toEqual(['same-copy-key', 'same-copy-key', 'second-copy-key'])
      }
    })

    it.each([undefined, null, '', '   '])(
      'rejects a blank copy key before reading a source or writing a copy (%s)',
      async (key) => {
        await expect(
          inPlantProducts(() => records.copy('GBN-PP-00-000000', key))
        ).rejects.toThrow('Idempotency-Key must not be blank')

        if (name === 'real HTTP adapter') {
          expect(fetchMocker.requests()).toEqual([])
        } else {
          expect((await inPlantProducts(() => records.list())).rows).toEqual([])
        }
      }
    )

    it('matches the shipped global key index across different sources', async () => {
      const firstSource = await inPlantProducts(() => records.create())
      const secondSource = await inPlantProducts(() => records.create())
      await inPlantProducts(() => records.finalise(firstSource.journeyId))
      await inPlantProducts(() => records.finalise(secondSource.journeyId))

      const first = await inPlantProducts(() =>
        records.copy(firstSource.journeyId, 'globally-unique-key')
      )
      const repeated = await inPlantProducts(() =>
        records.copy(secondSource.journeyId, 'globally-unique-key')
      )

      expect(repeated.journeyId).toBe(first.journeyId)
      expect((await inPlantProducts(() => records.list())).rows).toHaveLength(3)
      if (name === 'real HTTP adapter') {
        const copyRequests = fetchMocker
          .requests()
          .filter(({ url }) => url.endsWith('/copies'))
        expect(copyRequests.map(({ url }) => url)).toEqual([
          `${notificationsUrl}/${firstSource.journeyId}/copies`,
          `${notificationsUrl}/${secondSource.journeyId}/copies`
        ])
      }
    })
  }
)
