import { describe, it, expect } from 'vitest'
import { createIdentifierIndex } from './identifiers.js'

const catalogue = [
  { id: 'id-full-name', name: 'fullName', type: 'text', cardinality: 'single' },
  { id: 'id-email', name: 'email', type: 'email', cardinality: 'single' }
]

describe('engine/identifiers — the name<->id boundary', () => {
  it('resolves both directions', () => {
    const index = createIdentifierIndex(catalogue)
    expect(index.idOf('fullName')).toBe('id-full-name')
    expect(index.nameOf('id-email')).toBe('email')
    expect(index.recordOfName('email').type).toBe('email')
    expect(index.recordOfId('id-full-name').name).toBe('fullName')
  })

  it('reports membership and identifier lists', () => {
    const index = createIdentifierIndex(catalogue)
    expect(index.hasName('fullName')).toBe(true)
    expect(index.hasName('nope')).toBe(false)
    expect(index.hasId('id-email')).toBe(true)
    expect(index.hasId('nope')).toBe(false)
    expect(index.names()).toEqual(['fullName', 'email'])
    expect(index.ids()).toEqual(['id-full-name', 'id-email'])
    expect(index.size).toBe(2)
  })

  it('throws loudly on unknown identifiers (no silent undefined)', () => {
    const index = createIdentifierIndex(catalogue)
    expect(() => index.idOf('dob')).toThrow('Unknown obligation name "dob"')
    expect(() => index.nameOf('id-dob')).toThrow('Unknown obligation id')
  })

  it('asserts uniqueness of both identifier spaces at load time', () => {
    expect(() =>
      createIdentifierIndex([...catalogue, { id: 'id-x', name: 'fullName' }])
    ).toThrow('Duplicate obligation name "fullName"')
    expect(() =>
      createIdentifierIndex([...catalogue, { id: 'id-email', name: 'other' }])
    ).toThrow('Duplicate obligation id "id-email"')
  })

  it('survives a cosmetic rename: same id, new name (SHAPE-6)', () => {
    const renamed = catalogue.map((record) =>
      record.name === 'fullName' ? { ...record, name: 'legalName' } : record
    )
    const index = createIdentifierIndex(renamed)
    expect(index.nameOf('id-full-name')).toBe('legalName')
    expect(index.idOf('legalName')).toBe('id-full-name')
    expect(index.hasName('fullName')).toBe(false)
  })
})
