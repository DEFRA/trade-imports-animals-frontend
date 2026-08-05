import { describe, expect, it } from 'vitest'

import {
  bcpLabel,
  controlPointCodesFor,
  controlPointLabel,
  controlPointsFor,
  hasControlPoints,
  list
} from './bcps.js'

describe('plant-products BCP reference data', () => {
  it('provides one code-valued option per observed BCP', () => {
    const options = list()
    const codes = options.map(({ value }) => value)

    expect(options).toHaveLength(25)
    expect(new Set(codes)).toHaveProperty('size', options.length)

    for (const { value, text } of options) {
      expect(value).toEqual(expect.any(String))
      expect(value.length).toBeGreaterThan(0)
      expect(text).toMatch(new RegExp(`.+ - ${value}$`))
    }

    expect(options).toContainEqual({
      value: 'CONPNT',
      text: 'Control Point - CONPNT'
    })
    expect(options).toContainEqual({
      value: 'GBFOL4PP',
      text: 'Folkestone - GBFOL4PP'
    })
  })

  it('provides the two code-confirmed CONPNT premises in observed order', () => {
    expect(controlPointsFor('CONPNT')).toEqual([
      {
        value: 'INSPBAR1',
        text: 'Barfoots of Botley (Chichester)'
      },
      { value: 'INSPBER1', text: 'Berryplants Ltd' }
    ])
  })

  it('returns no premises for a premises-less or unknown BCP', () => {
    expect(controlPointsFor('GBLHR4PP')).toEqual([])
    expect(controlPointsFor('UNKNOWN')).toEqual([])
    expect(hasControlPoints('CONPNT')).toBe(true)
    expect(hasControlPoints('GBLHR4PP')).toBe(false)
    expect(hasControlPoints('UNKNOWN')).toBe(false)
  })

  it('provides premises codes for downstream allow-list gates', () => {
    expect(controlPointCodesFor('CONPNT')).toEqual(['INSPBAR1', 'INSPBER1'])
    expect(controlPointCodesFor('UNKNOWN')).toEqual([])
  })

  it('resolves known labels and treats unknown codes as total lookups', () => {
    expect(bcpLabel('GBFOL4PP')).toBe('Folkestone - GBFOL4PP')
    expect(bcpLabel('UNKNOWN')).toBeUndefined()
    expect(controlPointLabel('INSPBAR1')).toBe(
      'Barfoots of Botley (Chichester)'
    )
    expect(controlPointLabel('UNKNOWN')).toBeUndefined()
  })

  it('freezes exported option and code collections', () => {
    expect(Object.isFrozen(list())).toBe(true)
    expect(list().every(Object.isFrozen)).toBe(true)
    expect(Object.isFrozen(controlPointsFor('CONPNT'))).toBe(true)
    expect(controlPointsFor('CONPNT').every(Object.isFrozen)).toBe(true)
    expect(Object.isFrozen(controlPointCodesFor('CONPNT'))).toBe(true)
    expect(Object.isFrozen(controlPointsFor('UNKNOWN'))).toBe(true)
  })
})
