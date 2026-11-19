import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  resetModulesAndRunModeEachTest,
  switchToRealMode,
  switchToStubMode
} from '../../../common/test-helpers/run-mode.js'

// Address-book toRecord translates a countryCode to a display name via
// addressBookCountryName; with self-loading readers, calling it in real mode
// would trigger a countries fetch. This file's tests are about the address-
// book, not countries, so mock the reader to a fixed lookup — the fetch mock
// only has to answer address-book URLs.
const COUNTRY_LABELS = { BE: 'Belgium', FR: 'France' }
vi.mock('../countries/index.js', () => ({
  addressBookCountryName: async (code) => COUNTRY_LABELS[code] ?? code
}))

const ORG = '5900001'
const PHONE = '01632 960000'

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
  phone: PHONE,
  deleted: false,
  roles: [],
  ...overrides
})

/** An address book of `total` records, served the way the API serves it:
 * the requested page size or else `defaultPageSize` records per page, page
 * number taken from the query string. */
const bookOf = (
  total,
  defaultPageSize = 25,
  buildRecord = (id) => operator(id)
) => {
  const all = Array.from({ length: total }, (_, index) =>
    buildRecord(`record-${index + 1}`, index)
  )
  return async (url) => {
    const { searchParams } = new URL(url)
    const page = Number(searchParams.get('page') ?? 1)
    const apiPageSize = Number(searchParams.get('pageSize') ?? defaultPageSize)
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

const addressBook = () => import('./index.js')

resetModulesAndRunModeEachTest()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('#addresses against the real address book', () => {
  test('Should scope the request to the organisation in both path and header', async () => {
    const fetched = vi.fn(bookOf(10))
    switchToRealMode()
    stubFetch(fetched)

    const { addresses } = await addressBook()
    await addresses(ORG)

    const [url, options] = fetched.mock.calls[0]
    expect(url).toContain(`/organisation/${ORG}/addresses`)
    expect(options.headers['Trade-Imports-Organisation-Id']).toBe(ORG)
  })

  test('Should carry the request trace on to the address book', async () => {
    const fetched = vi.fn(bookOf(10))
    switchToRealMode()
    stubFetch(fetched)

    const { addresses } = await addressBook()
    await addresses(ORG)

    const [, options] = fetched.mock.calls[0]
    expect(options.headers).toHaveProperty('x-cdp-request-id')
  })

  test('Should return every matching record the book holds across more than one API page, not the first page only', async () => {
    const fetched = vi.fn(bookOf(60))
    switchToRealMode()
    stubFetch(fetched)

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found).toHaveLength(60)
    expect(found.at(-1).id).toBe('record-60')
  })

  test('Should make a single call when the book fits one page', async () => {
    const fetched = vi.fn(bookOf(3))
    switchToRealMode()
    stubFetch(fetched)

    const { addresses } = await addressBook()
    await addresses(ORG)

    expect(fetched).toHaveBeenCalledTimes(1)
  })

  test('Should read a large book in pages of a hundred', async () => {
    const fetched = vi.fn(bookOf(1001))
    switchToRealMode()
    stubFetch(fetched)

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found.map(({ id }) => id)).toEqual(
      Array.from({ length: 1001 }, (_, index) => `record-${index + 1}`)
    )
    expect(
      fetched.mock.calls.map(([url]) => new URL(url).searchParams.get('page'))
    ).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
    expect(
      fetched.mock.calls.every(
        ([url]) => new URL(url).searchParams.get('pageSize') === '100'
      )
    ).toBe(true)
  })

  test('Should have at most four page requests in flight at once', async () => {
    const serve = bookOf(2000)
    let inFlight = 0
    let mostInFlight = 0
    switchToRealMode()
    stubFetch(async (url) => {
      inFlight += 1
      mostInFlight = Math.max(mostInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
      return serve(url)
    })

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found).toHaveLength(2000)
    expect(mostInFlight).toBe(4)
  })

  test('Should send the search term to the address book and not the role', async () => {
    const fetched = vi.fn(bookOf(10))
    switchToRealMode()
    stubFetch(fetched)

    const { addresses } = await addressBook()
    await addresses(ORG, { query: 'nordvik', role: 'CONSIGNOR' })

    const { searchParams } = new URL(fetched.mock.calls[0][0])
    expect(searchParams.get('q')).toBe('nordvik')
    expect(searchParams.has('role')).toBe(false)
  })

  test('Should raise a failure rather than serving an empty book', async () => {
    switchToRealMode()
    stubFetch(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    }))

    const { addresses } = await addressBook()
    await expect(addresses(ORG)).rejects.toThrow('Failed to list addresses')
  })
})

describe('the role rule', () => {
  test('Should return a record whose roles include the role asked for', async () => {
    switchToRealMode()
    stubFetch(bookOf(1, 25, (id) => operator(id, { roles: ['CONSIGNOR'] })))

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNOR' })

    expect(found).toHaveLength(1)
  })

  test('Should not return a record whose roles belong to another role', async () => {
    switchToRealMode()
    stubFetch(bookOf(1, 25, (id) => operator(id, { roles: ['CONSIGNEE'] })))

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNOR' })

    expect(found).toEqual([])
  })

  test('Should return a record the book answers with an empty roles list, whatever role is asked for', async () => {
    switchToRealMode()
    stubFetch(bookOf(1, 25, (id) => operator(id, { roles: [] })))

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNOR' })

    expect(found).toHaveLength(1)
  })

  test('Should return a record carrying two roles when either is asked for', async () => {
    switchToRealMode()
    stubFetch(
      bookOf(1, 25, (id) => operator(id, { roles: ['CONSIGNEE', 'IMPORTER'] }))
    )

    const { addresses } = await addressBook()

    expect(await addresses(ORG, { role: 'CONSIGNEE' })).toHaveLength(1)
    expect(await addresses(ORG, { role: 'IMPORTER' })).toHaveLength(1)
  })

  test('Should return every live record when no role is asked for', async () => {
    switchToRealMode()
    stubFetch(
      bookOf(2, 25, (id, index) =>
        operator(id, { roles: index === 0 ? ['CONSIGNOR'] : [] })
      )
    )

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found).toHaveLength(2)
  })

  test('Should hold a single record whose roles include the role asked for', async () => {
    const { offeredForRole } = await addressBook()

    expect(offeredForRole({ roles: ['CONSIGNOR'] }, 'CONSIGNOR')).toBe(true)
  })

  test('Should not hold a single record whose roles belong to another role', async () => {
    const { offeredForRole } = await addressBook()

    expect(offeredForRole({ roles: ['CONSIGNEE'] }, 'CONSIGNOR')).toBe(false)
  })

  test('Should hold a single record whose roles list is empty, whatever role is asked for', async () => {
    const { offeredForRole } = await addressBook()

    expect(offeredForRole({ roles: [] }, 'CONSIGNOR')).toBe(true)
  })
})

describe('mapping the wire onto the journey', () => {
  test('Should map the API field names onto the ones the journey renders', async () => {
    switchToRealMode()
    stubFetch(bookOf(1))

    const { addresses } = await addressBook()
    const [record] = await addresses(ORG)

    expect(record).toMatchObject({
      id: 'record-1',
      roles: [],
      address: {
        addressLine1: '1 Test Street',
        townOrCity: 'Testville',
        county: 'Testshire',
        postcode: 'TE5 7ER',
        email: 'record-1@example.com',
        phone: PHONE
      }
    })
  })

  test('Should show a country by name, not by its code', async () => {
    switchToRealMode()
    stubFetch(bookOf(1))

    const { addresses } = await addressBook()
    const [record] = await addresses(ORG)

    expect(record.address.country).toBe('Belgium')
  })

  test('Should keep an unrecognised country code rather than dropping it', async () => {
    switchToRealMode()
    stubFetch(async () =>
      okResponse({
        items: [operator('record-1', { countryCode: 'ZZ' })],
        page: 1,
        pageSize: 25,
        totalItems: 1,
        totalPages: 1
      })
    )

    const { addresses } = await addressBook()
    const [record] = await addresses(ORG)

    expect(record.address.country).toBe('ZZ')
  })
})

describe('without an organisation', () => {
  test('Should refuse to read, rather than ask for an organisation named "undefined"', async () => {
    // The organisation sits in the path, so a missing one is not an error the
    // address book can see — it answers for an organisation of that literal
    // name, and an empty book comes back. A search then looks like "you have
    // saved nothing" and a resolve like "that address was deleted", when in
    // truth nobody was signed in. Fail here instead, and say why.
    switchToRealMode()
    stubFetch(async () => okResponse(operator('record-7')))

    const { addresses, party } = await addressBook()

    await expect(addresses(undefined)).rejects.toThrow(
      /without an organisation/
    )
    await expect(party(undefined, 'record-7')).rejects.toThrow(
      /without an organisation/
    )
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

describe('#party', () => {
  test('Should resolve a record by its id', async () => {
    switchToRealMode()
    stubFetch(async () => okResponse(operator('record-7')))

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toMatchObject({
      id: 'record-7',
      deleted: false
    })
  })

  test('Should surface a soft-deleted record as deleted, not as missing', async () => {
    switchToRealMode()
    stubFetch(async () => okResponse(operator('record-7', { deleted: true })))

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toMatchObject({ deleted: true })
  })

  test('Should resolve to nothing for a record this organisation cannot see', async () => {
    switchToRealMode()
    stubFetch(async () => ({ ok: false, status: 404, statusText: 'Not Found' }))

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toBeUndefined()
  })

  test('Should raise on an outage rather than reporting the record gone', async () => {
    switchToRealMode()
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

describe('writes', () => {
  test('Should expose no way to add, change or remove a record', async () => {
    const book = await addressBook()

    expect(Object.keys(book).sort()).toEqual([
      'addresses',
      'offeredForRole',
      'party'
    ])
  })
})

describe('in stub mode', () => {
  test('Should read the stub book without calling the API', async () => {
    const fetched = vi.fn()
    switchToStubMode()
    stubFetch(fetched)

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found.length).toBeGreaterThan(0)
    expect(fetched).not.toHaveBeenCalled()
  })

  test('Should search the stub book by free text', async () => {
    switchToStubMode()

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { query: 'nordvik' })

    expect(found).toHaveLength(1)
    expect(found[0].name).toContain('Nordvik')
  })

  test('Should keep a record holding the role asked for, and a record holding no role, dropping one holding another role', async () => {
    switchToStubMode()

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNOR' })

    expect(found.some((record) => record.id === 'astra-rosales')).toBe(true)
    expect(
      found.some((record) => record.id === 'unclassified-traders-ltd')
    ).toBe(true)
    expect(found.some((record) => record.id === 'tech-imports-ltd')).toBe(false)
  })

  test('Should filter identically to real mode: every record returned carries the role asked for, or carries none', async () => {
    switchToStubMode()

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNEE' })

    expect(
      found.every(
        (record) =>
          record.roles.includes('CONSIGNEE') || record.roles.length === 0
      )
    ).toBe(true)
  })
})
