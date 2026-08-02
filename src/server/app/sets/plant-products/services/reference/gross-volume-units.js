export const grossVolumeUnitOptions = Object.freeze([
  { value: 'LITRES', text: 'litres' },
  { value: 'METRES_CUBED', text: 'metres cubed' }
])

export const grossVolumeUnitLabel = (code) =>
  grossVolumeUnitOptions.find(({ value }) => value === code)?.text
