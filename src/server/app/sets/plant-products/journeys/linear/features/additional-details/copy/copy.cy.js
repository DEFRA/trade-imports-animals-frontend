export const copy = {
  caption: 'Disgrifiad o’r nwyddau',
  heading: 'Manylion ychwanegol',
  totals: {
    heading: 'Cyfanswm',
    netWeightLabel: 'Pwysau net y llwyth (kg)',
    packagesLabel: 'Nifer y pecynnau yn y llwyth'
  },
  fields: {
    totalGrossWeight: {
      label: 'Cyfanswm y pwysau gros (kg)'
    },
    grossVolume: {
      label: 'Cyfanswm y cyfaint gros (dewisol)'
    },
    grossVolumeUnit: {
      label: 'Uned',
      placeholder: 'Dewiswch uned'
    }
  },
  errors: {
    totalGrossWeightRequired: 'Nodwch gyfanswm y pwysau gros',
    totalGrossWeightNumber: 'Rhaid i gyfanswm y pwysau gros fod yn rhif',
    totalGrossWeightGreaterThanNet:
      'Rhaid i gyfanswm y pwysau gros fod yn fwy na’r pwysau net',
    totalGrossWeightDecimalPlaces:
      'Rhaid i gyfanswm y pwysau gros gael 5 lle degol neu lai',
    grossVolumeNumber: 'Rhaid i gyfanswm y cyfaint gros fod yn rhif',
    grossVolumeRequiredWithUnit: 'Nodwch gyfanswm y cyfaint gros',
    grossVolumeUnitRequired: 'Dewiswch fath o uned'
  }
}
