export const copy = {
  caption: 'Description of the goods',
  heading: 'Additional details',
  totals: {
    heading: 'Total',
    netWeightLabel: 'Net weight of the consignment (kg)',
    packagesLabel: 'Number of packages of the consignment'
  },
  fields: {
    totalGrossWeight: {
      label: 'Total gross weight (kg)'
    },
    grossVolume: {
      label: 'Total gross volume (optional)'
    },
    grossVolumeUnit: {
      label: 'Unit',
      placeholder: 'Select unit'
    }
  },
  errors: {
    totalGrossWeightRequired: 'Enter the total gross weight',
    totalGrossWeightNumber: 'Total gross weight must be a number',
    totalGrossWeightGreaterThanNet:
      'Total gross weight must be greater than the net weight',
    totalGrossWeightDecimalPlaces:
      'Total gross weight must have 5 decimal places or fewer',
    grossVolumeNumber: 'Total gross volume must be a number',
    grossVolumeRequiredWithUnit: 'Enter the total gross volume',
    grossVolumeUnitRequired: 'Select a unit type'
  }
}
