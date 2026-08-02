import { describe, expect, it } from 'vitest'

import { documentTypeLabel, documentTypeOptions } from './document-types.js'
import {
  grossVolumeUnitLabel,
  grossVolumeUnitOptions
} from './gross-volume-units.js'
import { packageTypeLabel, packageTypeOptions } from './package-types.js'
import { purposeLabel, purposeOptions } from './purposes.js'
import { quantityTypeLabel, quantityTypeOptions } from './quantity-types.js'
import {
  meansOfTransportLabel,
  meansOfTransportOptions
} from './transport-options.js'

const SCREAMING_SNAKE_CASE = /^[A-Z][A-Z0-9_]*$/

const referenceData = [
  {
    name: 'package types',
    options: packageTypeOptions,
    expectedCount: 23,
    labelFor: packageTypeLabel,
    knownCode: 'BAG',
    knownLabel: 'Bag'
  },
  {
    name: 'quantity types',
    options: quantityTypeOptions,
    expectedCount: 7,
    labelFor: quantityTypeLabel,
    knownCode: 'STEMS',
    knownLabel: 'Stems'
  },
  {
    name: 'document types',
    options: documentTypeOptions,
    expectedCount: 16,
    labelFor: documentTypeLabel,
    knownCode: 'AIR_WAYBILL',
    knownLabel: 'Air waybill'
  },
  {
    name: 'means of transport',
    options: meansOfTransportOptions,
    expectedCount: 4,
    labelFor: meansOfTransportLabel,
    knownCode: 'AIRPLANE',
    knownLabel: 'Airplane'
  },
  {
    name: 'gross volume units',
    options: grossVolumeUnitOptions,
    expectedCount: 2,
    labelFor: grossVolumeUnitLabel,
    knownCode: 'LITRES',
    knownLabel: 'litres'
  },
  {
    name: 'purposes',
    options: purposeOptions,
    expectedCount: 3,
    labelFor: purposeLabel,
    knownCode: 'INTERNAL_MARKET',
    knownLabel: 'Internal market'
  }
]

describe('plant-products reference data', () => {
  it.each(referenceData)(
    '$name contains the expected unique code-valued options',
    ({ name, options, expectedCount }) => {
      const values = options.map(({ value }) => value)
      const texts = options.map(({ text }) => text)

      expect(options, `${name} option count`).toHaveLength(expectedCount)
      expect(new Set(values).size, `${name} values must be unique`).toBe(
        options.length
      )
      expect(new Set(texts).size, `${name} texts must be unique`).toBe(
        options.length
      )

      for (const { value, text } of options) {
        expect(
          value,
          `${name} value ${value} must be a SCREAMING_SNAKE_CASE code`
        ).toMatch(SCREAMING_SNAKE_CASE)
        expect(
          value,
          `${name} must store code ${value}, not its display string`
        ).not.toBe(text)
      }
    }
  )

  it('contains exactly one canonical Sea waybill document type', () => {
    const seaWaybills = documentTypeOptions.filter(({ text }) =>
      /sea waybill/i.test(text)
    )

    expect(
      seaWaybills,
      'document types must contain exactly one Sea waybill option'
    ).toEqual([{ value: 'SEA_WAYBILL', text: 'Sea waybill' }])
  })

  it('matches the backend enum code order', () => {
    expect(
      meansOfTransportOptions.map(({ value }) => value),
      'means of transport codes must byte-match backend enum order'
    ).toEqual(['AIRPLANE', 'RAILWAY', 'ROAD_VEHICLE', 'VESSEL'])
    expect(
      grossVolumeUnitOptions.map(({ value }) => value),
      'gross volume unit codes must byte-match backend enum order'
    ).toEqual(['LITRES', 'METRES_CUBED'])
    expect(
      purposeOptions.map(({ value }) => value),
      'purpose codes must byte-match backend enum order'
    ).toEqual(['INTERNAL_MARKET', 'RE_ENTRY', 'RE_CONFORMITY_CHECK'])
  })

  it.each(referenceData)(
    '$name resolves known labels and returns undefined for unknown codes',
    ({ labelFor, knownCode, knownLabel }) => {
      expect(labelFor(knownCode)).toBe(knownLabel)
      expect(labelFor('UNKNOWN')).toBeUndefined()
    }
  )

  it.each(referenceData)('$name freezes its options array', ({ options }) => {
    expect(Object.isFrozen(options)).toBe(true)
  })
})
