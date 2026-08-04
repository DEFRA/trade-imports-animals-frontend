const formatter = new Intl.NumberFormat('en-GB', {
  useGrouping: false,
  minimumFractionDigits: 2,
  maximumFractionDigits: 20
})

export const measurementText = (value) => {
  if (value === undefined || value === null || value === '') return ''
  return typeof value === 'number' && Number.isFinite(value)
    ? formatter.format(value)
    : String(value)
}

export const measurementInput = (value) =>
  typeof value === 'number' ? measurementText(value) : (value ?? '')
