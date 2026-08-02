// Records-port contract from docs/add-a-set.md step 8.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { records as selectedRecords } from './index.js'
import { records } from './stub.js'

describe('plant-products records stub', () => {
  beforeEach(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    await records.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips a newly created draft', async () => {
    const created = await records.create()

    expect(created).toMatchObject({
      journeyId: expect.stringMatching(/^GBN-PP-/),
      reference: expect.stringMatching(/^GBN-PP-/),
      status: 'draft',
      fulfilment: []
    })
    expect(await records.load({ journeyId: created.journeyId })).toEqual(
      created
    )
    expect(await records.has(created.journeyId)).toBe(true)
  })

  it('persists the complete fulfilment snapshot', async () => {
    const created = await records.create()
    const snapshot = { countryOfOrigin: 'FR', commodityLines: [{ code: '01' }] }

    await records.replaceFulfilment(created.journeyId, snapshot)

    expect(
      (await records.load({ journeyId: created.journeyId })).fulfilment
    ).toEqual(snapshot)
  })

  it('enforces status transitions and restores a cancelled amendment', async () => {
    const created = await records.create()
    await records.replaceFulfilment(created.journeyId, { version: 'submitted' })
    const submitted = await records.finalise(created.journeyId)
    expect(submitted.status).toBe('submitted')

    await expect(records.finalise(created.journeyId)).rejects.toThrow(
      'cannot finalise'
    )
    const amending = await records.amend(created.journeyId)
    expect(amending.status).toBe('amend')
    await records.replaceFulfilment(created.journeyId, { version: 'changed' })
    const restored = await records.cancelAmend(created.journeyId)
    expect(restored).toMatchObject({
      status: 'submitted',
      fulfilment: { version: 'submitted' }
    })
  })

  it('hides deleted records from list and clears the store', async () => {
    const created = await records.create()
    await records.softDelete(created.journeyId)
    await records.softDelete(created.journeyId)

    expect(
      await records.list({ journeyIds: [created.journeyId] })
    ).toMatchObject({ rows: [], totalElements: 0 })

    await records.clear()
    expect(await records.has(created.journeyId)).toBe(false)
  })

  it('uses the stub only in stub mode and throws for every real-mode op', async () => {
    expect((await selectedRecords.create()).status).toBe('draft')
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'real')

    for (const operation of Object.values(selectedRecords)) {
      await expect(operation()).rejects.toThrow(
        'plant-products real records adapter not implemented — pp-008'
      )
    }
  })
})
