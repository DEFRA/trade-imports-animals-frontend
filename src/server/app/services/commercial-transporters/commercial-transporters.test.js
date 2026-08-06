import { describe, expect, test } from 'vitest'

import * as commercialTransporters from './index.js'
import * as addressBook from '../address-book/index.js'

describe('#parties', () => {
  test('Should return every transporter with a stable id', () => {
    const records = commercialTransporters.parties()

    expect(records.length).toBeGreaterThan(0)

    const ids = records.map((record) => record.id)
    expect(ids.every((id) => id && typeof id === 'string')).toBe(true)
    expect(new Set(ids).size).toBe(records.length)
  })

  test('Should carry the approval number the address book cannot represent', () => {
    for (const record of commercialTransporters.parties()) {
      expect(record.approvalNumber).toBeTruthy()
    }
  })

  test('Should resolve synchronously, so the picker can validate at module load', () => {
    expect(commercialTransporters.parties()).not.toBeInstanceOf(Promise)
  })
})

describe('#party', () => {
  test('Should look a transporter up by its id', () => {
    const first = commercialTransporters.parties()[0]

    expect(commercialTransporters.party(first.id).name).toBe(first.name)
  })

  test('Should return undefined for an id that is not a transporter', () => {
    expect(commercialTransporters.party('not-a-transporter')).toBeUndefined()
  })
})

describe('separation from the address book', () => {
  test('Should not be reachable through the address book', () => {
    expect(addressBook.parties('commercialTransporter')).toEqual([])
  })
})
