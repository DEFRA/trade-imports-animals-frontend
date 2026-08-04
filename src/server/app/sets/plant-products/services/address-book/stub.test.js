import { afterEach, describe, expect, it, vi } from 'vitest'

import { add, find, list } from './stub.js'

const sessionRequest = () => {
  const values = new Map()
  return {
    yar: {
      get: (key) => values.get(key),
      set: (key, value) => values.set(key, value)
    }
  }
}

const newConsignor = {
  name: 'Fresh Produce Co',
  telephone: '01632 960777',
  email: 'fresh@example.com',
  address: {
    addressLine1: '99 Example Street',
    addressLine2: '',
    addressLine3: '',
    city: 'Example City',
    postcode: 'ZZ99 99',
    country: 'NL'
  }
}

describe('plant-products address-book stub', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists exactly the twelve canned records for an empty session', async () => {
    const records = await list(sessionRequest())

    expect(records).toHaveLength(12)
    expect(records.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['example-consignor-01', 'example-consignor-12'])
    )
  })

  it('appends a created record last and resolves it by its assigned id', async () => {
    const request = sessionRequest()
    const created = await add(request, newConsignor)
    const records = await list(request)

    expect(created.id).toBe('created-consignor-1')
    expect(records).toHaveLength(13)
    expect(records.at(-1)).toEqual(created)
    await expect(find(request, created.id)).resolves.toEqual(created)
  })

  it('resolves a canned id and returns undefined for an unknown one', async () => {
    const request = sessionRequest()

    await expect(find(request, 'example-consignor-05')).resolves.toMatchObject({
      name: 'Example Consignor 05 (sample data)'
    })
    await expect(find(request, 'no-such-consignor')).resolves.toBeUndefined()
  })

  it('keeps one session’s created records invisible to another session', async () => {
    const first = sessionRequest()
    const second = sessionRequest()

    await add(first, newConsignor)

    expect(await list(first)).toHaveLength(13)
    expect(await list(second)).toHaveLength(12)
  })

  it.each([undefined, 'real', 'stub'])(
    'serves the same twelve canned records with PLANT_PRODUCTS_MODE=%s',
    async (mode) => {
      vi.stubEnv('PLANT_PRODUCTS_MODE', mode)

      const records = await list(sessionRequest())

      expect(records.map(({ id }) => id)).toEqual(
        Array.from(
          { length: 12 },
          (_unused, index) =>
            `example-consignor-${String(index + 1).padStart(2, '0')}`
        )
      )
    }
  )
})
