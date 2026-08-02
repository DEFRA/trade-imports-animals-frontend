export const quantityTypeOptions = Object.freeze([
  { value: 'STEMS', text: 'Stems' },
  { value: 'BULBS', text: 'Bulbs' },
  { value: 'CORMS_AND_RHIZOMES', text: 'Corms and rhizomes' },
  {
    value: 'PLANTS_IN_TISSUE_CULTURE',
    text: 'Plants in tissue culture'
  },
  { value: 'SEEDS', text: 'Seeds' },
  { value: 'KILOGRAMS', text: 'Kilograms' },
  { value: 'PIECES', text: 'Pieces' }
])

export const quantityTypeLabel = (code) =>
  quantityTypeOptions.find(({ value }) => value === code)?.text
