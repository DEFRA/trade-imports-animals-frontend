import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const originalMode = process.env.LIVE_ANIMALS_MODE

const ORG = '5900001'

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body })

const stubFetch = (impl) => vi.stubGlobal('fetch', vi.fn(impl))

const operator = (id, overrides = {}) => ({
  id,
  name: `Record ${id}`,
  addressLine1: '1 Test Street',
  townOrCity: 'Testville',
  county: 'Testshire',
  postcode: 'TE5 7ER',
  countryCode: 'BE',
  email: `${id}@example.com`,
  phone: '01632 960000',
  deleted: false,
  ...overrides
})

/** An address book of `total` records, served the way the API serves it:
 * `apiPageSize` records per page, page number taken from the query string. */
const bookOf = (total, apiPageSize = 25) => {
  const all = Array.from({ length: total }, (_, index) =>
    operator(`record-${index + 1}`)
  )
  return async (url) => {
    const page = Number(new URL(url).searchParams.get('page') ?? 1)
    const totalPages = Math.max(1, Math.ceil(total / apiPageSize))
    if (page > totalPages) {
      return { ok: false, status: 400, statusText: 'Page out of range' }
    }
    const from = (page - 1) * apiPageSize
    return okResponse({
      items: all.slice(from, from + apiPageSize),
      page,
      pageSize: apiPageSize,
      totalItems: total,
      totalPages
    })
  }
}

const realMode = () => {
  process.env.LIVE_ANIMALS_MODE = 'real'
}

const addressBook = () => import('./index.js')

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalMode === undefined) {
    delete process.env.LIVE_ANIMALS_MODE
  } else {
    process.env.LIVE_ANIMALS_MODE = originalMode
  }
})

describe('#search against the real address book', () => {
  test('Should scope the request to the organisation in both path and header', async () => {
    const fetched = vi.fn(bookOf(10))
    realMode()
    stubFetch(fetched)

    const { search } = await addressBook()
    await search(ORG, { page: 1 })

    const [url, options] = fetched.mock.calls[0]
    expect(url).toContain(`/organisation/${ORG}/addresses`)
    expect(options.headers['Trade-Imports-Organisation-Id']).toBe(ORG)
  })

  test('Should serve five records a page out of the API page of twenty-five', async () => {
    realMode()
    stubFetch(bookOf(60))

    const { search } = await addressBook()
    const found = await search(ORG, { page: 1 })

    expect(found.results).toHaveLength(5)
    expect(found.pageSize).toBe(5)
    expect(found.total).toBe(60)
    expect(found.totalPages).toBe(12)
    expect(found.results[0].id).toBe('record-1')
  })

  test('Should read a later page out of the API page that holds it', async () => {
    const fetched = vi.fn(bookOf(60))
    realMode()
    stubFetch(fetched)

    // Our page 6 starts at offset 25 — the first record of their page 2.
    const { search } = await addressBook()
    const found = await search(ORG, { page: 6 })

    expect(found.results[0].id).toBe('record-26')
    expect(found.results).toHaveLength(5)
    expect(new URL(fetched.mock.calls[0][0]).searchParams.get('page')).toBe('2')
  })

  test('Should fall back to the first page when asked for one past the end', async () => {
    realMode()
    stubFetch(bookOf(10))

    const { search } = await addressBook()
    const found = await search(ORG, { page: 99 })

    expect(found.page).toBe(1)
    expect(found.results[0].id).toBe('record-1')
  })

  test('Should re-slice against the size the server actually reports', async () => {
    const fetched = vi.fn(bookOf(60, 10))
    realMode()
    stubFetch(fetched)

    // Assuming 25 puts our page 6 on their page 2; at a real size of 10 the
    // record we want is on their page 3, so the service must ask again.
    const { search } = await addressBook()
    const found = await search(ORG, { page: 6 })

    expect(found.results[0].id).toBe('record-26')
    expect(new URL(fetched.mock.calls.at(-1)[0]).searchParams.get('page')).toBe(
      '3'
    )
  })

  test('Should pass a search term through to the API', async () => {
    const fetched = vi.fn(bookOf(10))
    realMode()
    stubFetch(fetched)

    const { search } = await addressBook()
    await search(ORG, { query: 'nordvik' })

    expect(new URL(fetched.mock.calls[0][0]).searchParams.get('q')).toBe(
      'nordvik'
    )
  })

  test('Should raise a failure rather than serving an empty book', async () => {
    realMode()
    stubFetch(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    }))

    const { search } = await addressBook()
    await expect(search(ORG, { page: 1 })).rejects.toThrow(
      'Failed to list addresses'
    )
  })
})

describe('mapping the wire onto the journey', () => {
  test('Should map the API field names onto the ones the journey renders', async () => {
    realMode()
    stubFetch(bookOf(1))

    const { search } = await addressBook()
    const [record] = (await search(ORG, { page: 1 })).results

    expect(record).toMatchObject({
      id: 'record-1',
      address: {
        addressLine1: '1 Test Street',
        townOrCity: 'Testville',
        county: 'Testshire',
        postalOrZipCode: 'TE5 7ER',
        emailAddress: 'record-1@example.com',
        telephoneNumber: '01632 960000'
      }
    })
  })

  test('Should show a country by name, not by its code', async () => {
    realMode()
    stubFetch(bookOf(1))

    const { search } = await addressBook()
    const [record] = (await search(ORG, { page: 1 })).results

    expect(record.address.country).toBe('Belgium')
  })

  test('Should keep an unrecognised country code rather than dropping it', async () => {
    realMode()
    stubFetch(async () =>
      okResponse({
        items: [operator('record-1', { countryCode: 'ZZ' })],
        page: 1,
        pageSize: 25,
        totalItems: 1,
        totalPages: 1
      })
    )

    const { search } = await addressBook()
    const [record] = (await search(ORG, { page: 1 })).results

    expect(record.address.country).toBe('ZZ')
  })
})

describe('#party', () => {
  test('Should resolve a record by its id', async () => {
    realMode()
    stubFetch(async () => okResponse(operator('record-7')))

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toMatchObject({
      id: 'record-7',
      deleted: false
    })
  })

  test('Should surface a soft-deleted record as deleted, not as missing', async () => {
    realMode()
    stubFetch(async () => okResponse(operator('record-7', { deleted: true })))

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toMatchObject({ deleted: true })
  })

  test('Should resolve to nothing for a record this organisation cannot see', async () => {
    realMode()
    stubFetch(async () => ({ ok: false, status: 404, statusText: 'Not Found' }))

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toBeUndefined()
  })

  test('Should raise on an outage rather than reporting the record gone', async () => {
    realMode()
    stubFetch(async () => ({
      ok: false,
      status: 500,
      statusText: 'Server Error'
    }))

    const { party } = await addressBook()
    await expect(party(ORG, 'record-7')).rejects.toThrow(
      'Failed to get address'
    )
  })
})

describe('#all', () => {
  test('Should gather every page for the unpaginated contact list', async () => {
    realMode()
    stubFetch(bookOf(60))

    const { all } = await addressBook()
    const records = await all(ORG)

    expect(records).toHaveLength(60)
    expect(records.at(-1).id).toBe('record-60')
  })

  test('Should make a single call when the book fits one page', async () => {
    const fetched = vi.fn(bookOf(3))
    realMode()
    stubFetch(fetched)

    const { all } = await addressBook()
    await all(ORG)

    expect(fetched).toHaveBeenCalledTimes(1)
  })
})

describe('#addParty', () => {
  test('Should save an address and hand back the id the journey references', async () => {
    const fetched = vi.fn(async () => okResponse(operator('created-1')))
    realMode()
    stubFetch(fetched)

    const { addParty } = await addressBook()
    const saved = await addParty(ORG, {
      name: 'New Trader',
      address: {
        addressLine1: '2 New Road',
        country: 'Belgium',
        emailAddress: 'new@example.com',
        telephoneNumber: '01632 960111'
      }
    })

    expect(saved.id).toBe('created-1')

    const [, options] = fetched.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toMatchObject({
      name: 'New Trader',
      addressLine1: '2 New Road',
      countryCode: 'BE',
      email: 'new@example.com',
      phone: '01632 960111'
    })
  })
})

describe('in stub mode', () => {
  test('Should page the stub book without calling the API', async () => {
    const fetched = vi.fn()
    process.env.LIVE_ANIMALS_MODE = 'stub'
    stubFetch(fetched)

    const { search } = await addressBook()
    const found = await search(ORG, { page: 1 })

    expect(found.results).toHaveLength(5)
    expect(found.pageSize).toBe(5)
    expect(fetched).not.toHaveBeenCalled()
  })

  test('Should search the stub book by free text', async () => {
    process.env.LIVE_ANIMALS_MODE = 'stub'

    const { search } = await addressBook()
    const found = await search(ORG, { query: 'nordvik' })

    expect(found.total).toBe(1)
    expect(found.results[0].name).toContain('Nordvik')
  })
})

describe('the book is untyped (D3)', () => {
  test('Should offer the same records whichever role is being filled', async () => {
    process.env.LIVE_ANIMALS_MODE = 'stub'

    const { search } = await addressBook()
    const forConsignor = await search(ORG, { page: 1 })
    const forConsignee = await search(ORG, { page: 1 })

    expect(forConsignor.results).toEqual(forConsignee.results)
    expect(forConsignor.total).toBe(forConsignee.total)
  })
})
