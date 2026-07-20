import { describe, it, expect } from 'vitest'

import {
  commercialTransporter,
  privateTransporter,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  contactAddress,
  permanentAddress
} from '../obligations/obligations.js'

import {
  domain,
  addressBlock,
  commercialTransporterDomain,
  privateTransporterDomain,
  permanentAddressDomain
} from './index.js'

describe('manifest', () => {
  it('keys one address entry per address-block obligation', () => {
    expect(domain.get(commercialTransporter.id)).toBe(
      commercialTransporterDomain
    )
    expect(domain.get(privateTransporter.id)).toBe(privateTransporterDomain)
    expect(domain.get(permanentAddress.id)).toBe(permanentAddressDomain)
    for (const obligation of [
      placeOfOrigin,
      consignor,
      consignee,
      importer,
      placeOfDestination,
      contactAddress
    ]) {
      expect(domain.get(obligation.id)?.type).toBe('address')
    }
  })

  it('contains ONLY address completeness entries — scalar value legality is feature-owned', () => {
    // Item 9 ruling: the model's enum/predicate validation layer was
    // deleted; pages own value legality. Anything non-address appearing
    // here is that layer creeping back.
    const nonAddress = [...domain.values()].filter(
      (entry) => entry.type !== 'address'
    )
    expect(nonAddress).toEqual([])
    expect(domain.size).toBe(9)
  })
})

describe('addressBlock — completeness (the one live domain signal)', () => {
  const fullValid = {
    name: 'ACME',
    transporterAuthorisationNumber: 'UK/AUTH/2026/001',
    addressLine1: 'Farm Lane',
    town: 'Exeter',
    postcode: 'EX1 1AA',
    country: 'GB',
    telephone: '+44 1234 567890',
    email: 'ops@acme.example'
  }

  it('exposes type + required for the V4 standard block', () => {
    expect(privateTransporterDomain.type).toBe('address')
    expect(privateTransporterDomain.required).toEqual([
      'name',
      'addressLine1',
      'town',
      'postcode',
      'country',
      'telephone',
      'email'
    ])
  })

  it('commercialTransporter additionally requires the authorisation number', () => {
    expect(commercialTransporterDomain.required).toContain(
      'transporterAuthorisationNumber'
    )
    expect(
      commercialTransporterDomain.isComplete({
        ...fullValid,
        transporterAuthorisationNumber: ''
      })
    ).toBe(false)
  })

  it('isComplete: true iff every required sub-field is a non-blank string', () => {
    expect(commercialTransporterDomain.isComplete(fullValid)).toBe(true)
    // Blank optional (addressLine2 / county) doesn't affect completeness.
    expect(
      commercialTransporterDomain.isComplete({
        ...fullValid,
        addressLine2: '',
        county: ''
      })
    ).toBe(true)
    // Blank required sub-field → not complete.
    expect(
      commercialTransporterDomain.isComplete({ ...fullValid, telephone: '' })
    ).toBe(false)
    // Whitespace-only required sub-field → not complete.
    expect(
      commercialTransporterDomain.isComplete({ ...fullValid, town: '   ' })
    ).toBe(false)
    // Undefined / null / non-object → not complete.
    expect(commercialTransporterDomain.isComplete(undefined)).toBe(false)
    expect(commercialTransporterDomain.isComplete(null)).toBe(false)
    expect(commercialTransporterDomain.isComplete('string')).toBe(false)
    expect(commercialTransporterDomain.isComplete([])).toBe(false)
  })

  it('factory: an entry with no required list is complete for any object', () => {
    const entry = addressBlock({})
    expect(entry.isComplete({})).toBe(true)
    expect(entry.isComplete(null)).toBe(false)
  })
})
