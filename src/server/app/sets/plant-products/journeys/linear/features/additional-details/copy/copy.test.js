import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

describe('plant-products additional-details copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('pins the page, totals and field copy', () => {
    expect(en).toMatchObject({
      caption: 'Description of the goods',
      heading: 'Additional details',
      totals: {
        heading: 'Total',
        netWeightLabel: 'Net weight of the consignment (kg)',
        packagesLabel: 'Number of packages of the consignment'
      },
      fields: {
        totalGrossWeight: { label: 'Total gross weight (kg)' },
        grossVolume: { label: 'Total gross volume (optional)' },
        grossVolumeUnit: { label: 'Unit', placeholder: 'Select unit' }
      }
    })
  })

  it('pins every canonical validation message', () => {
    expect(en.errors).toEqual({
      totalGrossWeightRequired: 'Enter the total gross weight',
      totalGrossWeightNumber: 'Total gross weight must be a number',
      totalGrossWeightGreaterThanNet:
        'Total gross weight must be greater than the net weight',
      totalGrossWeightDecimalPlaces:
        'Total gross weight must have 5 decimal places or fewer',
      grossVolumeNumber: 'Total gross volume must be a number',
      grossVolumeRequiredWithUnit: 'Enter the total gross volume',
      grossVolumeUnitRequired: 'Select a unit type'
    })
  })
})
