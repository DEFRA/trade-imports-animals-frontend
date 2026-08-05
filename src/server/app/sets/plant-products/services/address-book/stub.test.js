import { afterEach, describe, expect, it, vi } from 'vitest'

import { add, find, list, search, PAGE_SIZE } from './stub.js'

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

describe('plant-products address-book search', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('pages the canned catalogue five at a time on a fresh session', async () => {
    const found = await search(sessionRequest(), { query: '', page: 1 })

    expect(PAGE_SIZE).toBe(5)
    expect(found).toMatchObject({
      total: 12,
      page: 1,
      totalPages: 3,
      pageSize: 5
    })
    expect(found.results.map(({ id }) => id)).toEqual([
      'example-consignor-01',
      'example-consignor-02',
      'example-consignor-03',
      'example-consignor-04',
      'example-consignor-05'
    ])
  })

  it('returns the middle page and the short tail page', async () => {
    const request = sessionRequest()

    await expect(
      search(request, { page: 2 }).then((found) =>
        found.results.map(({ id }) => id)
      )
    ).resolves.toEqual([
      'example-consignor-06',
      'example-consignor-07',
      'example-consignor-08',
      'example-consignor-09',
      'example-consignor-10'
    ])
    await expect(
      search(request, { page: 3 }).then((found) =>
        found.results.map(({ id }) => id)
      )
    ).resolves.toEqual(['example-consignor-11', 'example-consignor-12'])
  })

  it.each([99, 0, -1])(
    'falls back to page 1 for the out-of-range page %s',
    async (page) => {
      const found = await search(sessionRequest(), { page })

      expect(found.page).toBe(1)
      expect(found.results).toHaveLength(PAGE_SIZE)
      expect(found.results[0].id).toBe('example-consignor-01')
    }
  )

  it('narrows to a single record when the query names it', async () => {
    const found = await search(sessionRequest(), {
      query: 'Example Consignor 07'
    })

    expect(found).toMatchObject({ total: 1, totalPages: 1 })
    expect(found.results.map(({ id }) => id)).toEqual(['example-consignor-07'])
  })

  it('matches an address line and a country code, not only the name', async () => {
    const byAddressLine = await search(sessionRequest(), {
      query: '7 Example Street'
    })
    const byCountryCode = await search(sessionRequest(), { query: 'GB-SCT' })

    expect(byAddressLine.results.map(({ id }) => id)).toEqual([
      'example-consignor-07'
    ])
    expect(byCountryCode.results.map(({ id }) => id)).toEqual([
      'example-consignor-12'
    ])
  })

  it('ignores case and surrounding whitespace', async () => {
    const found = await search(sessionRequest(), {
      query: '   eXaMpLe CoNsIgNoR 09   '
    })

    expect(found.results.map(({ id }) => id)).toEqual(['example-consignor-09'])
  })

  it('returns an empty page rather than throwing when nothing matches', async () => {
    const found = await search(sessionRequest(), { query: 'no such trader' })

    expect(found).toMatchObject({ total: 0, page: 1, totalPages: 1 })
    expect(found.results).toEqual([])
  })

  it('covers this session’s created records as well as the canned catalogue', async () => {
    const request = sessionRequest()
    const created = await add(request, newConsignor)

    const everything = await search(request, {})
    const lastPage = await search(request, { page: everything.totalPages })
    const byName = await search(request, { query: 'Fresh Produce' })

    expect(everything.total).toBe(13)
    expect(lastPage.results.map(({ id }) => id)).toContain(created.id)
    expect(byName.results.map(({ id }) => id)).toEqual([created.id])
  })

  it.each([undefined, 'real', 'stub'])(
    'searches the same twelve canned records with PLANT_PRODUCTS_MODE=%s',
    async (mode) => {
      vi.stubEnv('PLANT_PRODUCTS_MODE', mode)

      const found = await search(sessionRequest(), {})

      expect(found).toMatchObject({ total: 12, totalPages: 3 })
      expect(found.results).toHaveLength(5)
    }
  )
})
