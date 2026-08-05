import { describe, expect, it } from 'vitest'

import { COUNTRIES } from '../reference/countries.js'
import { CANNED_CONSIGNORS } from './canned-consignors.js'

const BANNED_KEYS = [
  'townOrCity',
  'county',
  'postalOrZipCode',
  'telephoneNumber',
  'emailAddress',
  'operatorId'
]

const keysAtEveryDepth = (value) =>
  value !== null && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => [
        key,
        ...keysAtEveryDepth(child)
      ])
    : []

describe('plant-products canned consignors', () => {
  it('carries exactly twelve records with sequential example ids', () => {
    expect(CANNED_CONSIGNORS).toHaveLength(12)
    expect(CANNED_CONSIGNORS.map(({ id }) => id)).toEqual([
      'example-consignor-01',
      'example-consignor-02',
      'example-consignor-03',
      'example-consignor-04',
      'example-consignor-05',
      'example-consignor-06',
      'example-consignor-07',
      'example-consignor-08',
      'example-consignor-09',
      'example-consignor-10',
      'example-consignor-11',
      'example-consignor-12'
    ])
  })

  it('names, addresses and contacts every record from a reserved fake range', () => {
    for (const record of CANNED_CONSIGNORS) {
      expect(record.name).toMatch(/^Example Consignor \d{2} \(sample data\)$/)
      expect(record.address.addressLine1).toMatch(/^\d{1,2} Example Street$/)
      expect(record.address.city).toBe('Example City')
      expect(record.address.postcode).toMatch(/^ZZ99 \d{2}$/)
      expect(record.telephone).toMatch(/^01632 9600\d{2}$/)
      expect(record.email).toMatch(/^consignor\d{2}@example\.com$/)
    }
  })

  it('gives every record the telephone and email plant makes mandatory', () => {
    for (const { telephone, email } of CANNED_CONSIGNORS) {
      expect(telephone.trim()).not.toBe('')
      expect(email.trim()).not.toBe('')
    }
  })

  it('uses only country codes the consignor form itself accepts', () => {
    const allowed = COUNTRIES.map(({ code }) => code)

    for (const record of CANNED_CONSIGNORS) {
      expect(allowed).toContain(record.address.country)
    }
  })

  it('carries no live-animals field name and no invented operator id', () => {
    for (const record of CANNED_CONSIGNORS) {
      const keys = keysAtEveryDepth(record)

      expect(keys.filter((key) => BANNED_KEYS.includes(key))).toEqual([])
    }
  })
})
