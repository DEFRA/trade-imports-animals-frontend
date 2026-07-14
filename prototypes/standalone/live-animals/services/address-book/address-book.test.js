import { describe, expect, it } from 'vitest'

import * as addressBook from './index.js'

const PARTY_ROLES = [
  'consignor',
  'consignee',
  'importer',
  'placeOfOrigin',
  'destination'
]

describe('address-book — the book each party spoke picks from', () => {
  it('Should hold 40 records per party role, every one with a stable id', () => {
    for (const role of PARTY_ROLES) {
      const records = addressBook.parties(role)
      expect(records).toHaveLength(40)

      const ids = records.map((record) => record.id)
      expect(ids.every((id) => id && typeof id === 'string')).toBe(true)
      expect(new Set(ids).size).toBe(40)
    }
  })

  it('Should look a record up by its id, whatever page of results it falls on', () => {
    const last = addressBook.parties('consignor').at(-1)
    const onLastPage = addressBook
      .search('consignor', { page: 8 })
      .results.map((record) => record.id)

    expect(onLastPage).toContain(last.id)
    expect(addressBook.party('consignor', last.id).name).toBe(last.name)
  })
})

describe('address-book search — the book owns filtering and pagination', () => {
  it('Should page an unfiltered book five at a time over eight pages', () => {
    const first = addressBook.search('consignor', { page: 1 })

    expect(first).toMatchObject({
      total: 40,
      page: 1,
      totalPages: 8,
      pageSize: 5
    })
    expect(first.results.map((record) => record.name)).toEqual([
      'Astra Rosales',
      'EuroStore Services',
      'Laiterie du Nord SARL',
      'Danish Meat Export ApS',
      'Portuguese Livestock Lda'
    ])

    const third = addressBook.search('consignor', { page: 3 })
    expect(third.results).toHaveLength(5)
    expect(third.results.map((record) => record.id)).not.toEqual(
      first.results.map((record) => record.id)
    )
  })

  it('Should match on name, on any address line and on country, case-insensitively', () => {
    const byName = addressBook.search('consignor', { query: 'danish meat' })
    expect(byName.total).toBe(1)
    expect(byName.results[0].id).toBe('danish-meat-export')

    const byAddress = addressBook.search('consignor', {
      query: 'Mannerheimintie'
    })
    expect(byAddress.results.map((record) => record.id)).toEqual([
      'finnish-livestock'
    ])

    const byCountry = addressBook.search('consignor', { query: 'denmark' })
    expect(byCountry.results.map((record) => record.id)).toEqual([
      'danish-meat-export',
      'jutland-swine'
    ])
  })

  it('Should repaginate the filtered results, not the whole book', () => {
    const filtered = addressBook.search('placeOfOrigin', { query: 'france' })

    expect(filtered.total).toBe(3)
    expect(filtered.totalPages).toBe(1)
    expect(filtered.results.map((record) => record.id)).toEqual([
      'ferme-des-alpes',
      'ferme-du-perche',
      'ferme-de-la-loire'
    ])
  })

  it('Should return an empty page one when nothing matches', () => {
    const none = addressBook.search('importer', { query: 'no such trader' })

    expect(none).toMatchObject({
      results: [],
      total: 0,
      page: 1,
      totalPages: 1
    })
  })

  it('Should fall back to the first page when the asked-for page is out of range', () => {
    const beyond = addressBook.search('consignee', { page: 99 })
    const nonsense = addressBook.search('consignee', { page: Number.NaN })

    expect(beyond.page).toBe(1)
    expect(beyond.results[0].id).toBe('british-livestock')
    expect(nonsense.page).toBe(1)
  })

  it('Should offer a user-created address through search under its minted id', () => {
    const record = addressBook.addParty('destination', {
      name: 'Searchable Created Holding',
      address: { addressLine1: '1 New Way', country: 'United Kingdom' }
    })
    const found = addressBook.search('destination', { query: 'searchable' })

    expect(record.id).toMatch(/^created-destination-\d+$/)
    expect(found.results.map((result) => result.id)).toEqual([record.id])
    expect(addressBook.party('destination', record.id).name).toBe(
      'Searchable Created Holding'
    )
  })
})
