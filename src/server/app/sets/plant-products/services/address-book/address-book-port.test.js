import { describe, expect, it } from 'vitest'

import { withSetContext } from '../../../../shared/set-context.js'
import * as barrel from './index.js'
import * as stub from './stub.js'

const BANNED_KEYS = [
  'townOrCity',
  'county',
  'postalOrZipCode',
  'telephoneNumber',
  'emailAddress',
  'operatorId'
]

const sessionRequest = () => {
  const values = new Map()
  return {
    yar: {
      get: (key) => values.get(key),
      set: (key, value) => values.set(key, value)
    }
  }
}

const inPlantProducts = (operation) =>
  withSetContext('plant-products', operation)

const keysAtEveryDepth = (value) =>
  value !== null && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => [
        key,
        ...keysAtEveryDepth(child)
      ])
    : []

const newConsignor = (name) => ({
  name,
  telephone: '01632 960777',
  email: 'fresh@example.com',
  address: {
    addressLine1: '99 Example Street',
    city: 'Example City',
    postcode: 'ZZ99 99',
    country: 'NL'
  }
})

// One implementation until EUDPA-58 lands: the table re-runs the same contract
// over the barrel and the adapter, which proves the barrel neither adds nor
// hides behaviour.
const subjects = [
  { name: 'address-book barrel', addressBook: barrel },
  { name: 'address-book stub adapter', addressBook: stub }
]

describe.each(subjects)(
  'plant-products address-book port — $name',
  ({ addressBook }) => {
    it('keeps every operation scoped to the request it was given', async () => {
      const first = sessionRequest()
      const second = sessionRequest()

      const created = await inPlantProducts(() =>
        addressBook.add(first, newConsignor('First Session Only'))
      )

      await expect(
        inPlantProducts(() => addressBook.list(first))
      ).resolves.toHaveLength(13)
      await expect(
        inPlantProducts(() => addressBook.list(second))
      ).resolves.toHaveLength(12)
      await expect(
        inPlantProducts(() => addressBook.find(second, created.id))
      ).resolves.toBeUndefined()
    })

    it('resolves an added record by the id it returned', async () => {
      const request = sessionRequest()

      const created = await inPlantProducts(() =>
        addressBook.add(request, newConsignor('Resolvable Consignor'))
      )

      expect(created.id).toEqual(expect.any(String))
      await expect(
        inPlantProducts(() => addressBook.find(request, created.id))
      ).resolves.toEqual(created)
    })

    it('resolves an unknown id to undefined rather than throwing', async () => {
      await expect(
        inPlantProducts(() => addressBook.find(sessionRequest(), 'nope'))
      ).resolves.toBeUndefined()
    })

    it('pages the whole book from the request it was given', async () => {
      const first = sessionRequest()
      const second = sessionRequest()
      await inPlantProducts(() =>
        addressBook.add(first, newConsignor('Paged Session Only'))
      )

      const forFirst = await inPlantProducts(() =>
        addressBook.search(first, { query: '', page: 1 })
      )
      const forSecond = await inPlantProducts(() =>
        addressBook.search(second, { query: '', page: 1 })
      )

      expect(Object.keys(forFirst).sort()).toEqual([
        'page',
        'pageSize',
        'results',
        'total',
        'totalPages'
      ])
      expect(forFirst.total).toBe(13)
      expect(forSecond.total).toBe(12)
      await expect(
        inPlantProducts(() =>
          addressBook.search(second, { query: 'Paged Session Only' })
        )
      ).resolves.toMatchObject({ total: 0, results: [] })
    })

    it('filters on any part of a record and pages what is left', async () => {
      const request = sessionRequest()

      const byCountryCode = await inPlantProducts(() =>
        addressBook.search(request, { query: 'gb-sct' })
      )
      const wholeBook = await inPlantProducts(() =>
        addressBook.search(request, { page: 3 })
      )

      expect(byCountryCode).toMatchObject({ total: 1, totalPages: 1 })
      expect(wholeBook).toMatchObject({ page: 3, totalPages: 3, total: 12 })
      expect(wholeBook.results).toHaveLength(2)
    })

    it('lists records in the plant shape with a telephone and email on each', async () => {
      const request = sessionRequest()
      await inPlantProducts(() =>
        addressBook.add(request, newConsignor('Listed Consignor'))
      )

      for (const record of await inPlantProducts(() =>
        addressBook.list(request)
      )) {
        const keys = keysAtEveryDepth(record)

        expect(keys.filter((key) => BANNED_KEYS.includes(key))).toEqual([])
        expect(record.telephone.trim()).not.toBe('')
        expect(record.email.trim()).not.toBe('')
      }
    })
  }
)
