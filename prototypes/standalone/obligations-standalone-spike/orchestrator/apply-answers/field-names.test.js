import { describe, it, expect } from 'vitest'
import { decodeFieldName, encodeFieldName } from './field-names.js'

describe('orchestrator/apply-answers — the form-name convention', () => {
  it('encodes single slots as the bare name and indexed slots with the encoded id', () => {
    expect(encodeFieldName('fullName')).toBe('fullName')
    expect(encodeFieldName('claimType', 'f-1')).toBe('claimType__f-1')
    expect(encodeFieldName('claimType', 'a b')).toBe('claimType__a%20b')
  })

  it('decodes back, splitting on the first separator only', () => {
    expect(decodeFieldName('fullName')).toEqual({
      name: 'fullName',
      fulfilmentId: null
    })
    expect(decodeFieldName('claimType__a%20b')).toEqual({
      name: 'claimType',
      fulfilmentId: 'a b'
    })
    expect(decodeFieldName(encodeFieldName('claimType', 'f__x'))).toEqual({
      name: 'claimType',
      fulfilmentId: 'f__x'
    })
  })
})
