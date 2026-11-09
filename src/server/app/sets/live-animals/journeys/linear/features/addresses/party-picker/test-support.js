export const PICKER_ROW_NAME = 'Astra Rosales'
export const PICKER_ROW_STREET_LINE = 'Rua da Boavista 100'
export const PICKER_ROW_LOCALITY_LINE = 'Porto, 4050-113'
export const PICKER_ROW_VIEW_HREF =
  'http://localhost:3002/address-book/astra-rosales?return=http%3A%2F%2Flocalhost%3A3000%2Fpicker'

export const pickerRow = (overrides = {}) => ({
  id: 'astra-rosales',
  idPrefix: 'party',
  name: PICKER_ROW_NAME,
  addressLines: [PICKER_ROW_STREET_LINE, PICKER_ROW_LOCALITY_LINE],
  country: 'Portugal',
  viewHref: PICKER_ROW_VIEW_HREF,
  checked: false,
  ...overrides
})
