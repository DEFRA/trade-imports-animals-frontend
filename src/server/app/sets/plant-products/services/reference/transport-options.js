export const meansOfTransportOptions = Object.freeze([
  { value: 'AIRPLANE', text: 'Airplane' },
  { value: 'RAILWAY', text: 'Railway' },
  { value: 'ROAD_VEHICLE', text: 'Road vehicle' },
  { value: 'VESSEL', text: 'Vessel' }
])

export const meansOfTransportLabel = (code) =>
  meansOfTransportOptions.find(({ value }) => value === code)?.text
