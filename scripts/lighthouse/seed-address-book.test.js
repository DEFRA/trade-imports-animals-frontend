import { afterEach, describe, expect, it, vi } from 'vitest'

import { ensureAddressBookCoversEverySelectableRole } from './seed-address-book.js'

const ADDRESSES_PATH = '/organisation/5900001/addresses'

const listResponse = (items) => ({
  ok: true,
  status: 200,
  json: async () => ({ items })
})

const createdResponse = () => ({
  ok: true,
  status: 201,
  json: async () => ({})
})

const addressHolding = (role) => ({ roles: [role] })

const requestsTo = (calls, method) =>
  calls
    .filter(([, options]) => (options?.method ?? 'GET') === method)
    .map(([url, options]) => ({ url, body: JSON.parse(options.body) }))

describe('#ensureAddressBookCoversEverySelectableRole', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates an address for every role the journey selects an address by when the book holds none', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValue(createdResponse())
    vi.stubGlobal('fetch', fetchSpy)

    await ensureAddressBookCoversEverySelectableRole()

    const created = requestsTo(fetchSpy.mock.calls, 'POST')
    expect(created.map(({ body }) => body.roles)).toEqual([
      ['PLACE_OF_ORIGIN'],
      ['CONSIGNOR'],
      ['CONSIGNEE'],
      ['IMPORTER'],
      ['PLACE_OF_DESTINATION'],
      ['BRANCH_ADDRESS']
    ])
    expect(created.every(({ url }) => url.includes(ADDRESSES_PATH))).toBe(true)
  })

  it('creates nothing when an existing address already covers every role', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        listResponse([
          addressHolding('PLACE_OF_ORIGIN'),
          addressHolding('CONSIGNOR'),
          addressHolding('CONSIGNEE'),
          addressHolding('IMPORTER'),
          addressHolding('PLACE_OF_DESTINATION'),
          addressHolding('BRANCH_ADDRESS')
        ])
      )
    vi.stubGlobal('fetch', fetchSpy)

    await ensureAddressBookCoversEverySelectableRole()

    expect(requestsTo(fetchSpy.mock.calls, 'POST')).toEqual([])
  })

  it('creates only the roles no existing address already holds', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(listResponse([addressHolding('CONSIGNOR')]))
      .mockResolvedValue(createdResponse())
    vi.stubGlobal('fetch', fetchSpy)

    await ensureAddressBookCoversEverySelectableRole()

    const created = requestsTo(fetchSpy.mock.calls, 'POST')
    expect(created.map(({ body }) => body.roles)).toEqual([
      ['PLACE_OF_ORIGIN'],
      ['CONSIGNEE'],
      ['IMPORTER'],
      ['PLACE_OF_DESTINATION'],
      ['BRANCH_ADDRESS']
    ])
  })

  it('throws when listing the address book fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    )

    await expect(ensureAddressBookCoversEverySelectableRole()).rejects.toThrow(
      /Could not list address book/
    )
  })

  it('throws when creating a missing-role address fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(listResponse([]))
        .mockResolvedValue({ ok: false, status: 500 })
    )

    await expect(ensureAddressBookCoversEverySelectableRole()).rejects.toThrow(
      /Could not create a "PLACE_OF_ORIGIN" address/
    )
  })
})
