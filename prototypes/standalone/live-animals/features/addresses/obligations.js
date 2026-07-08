export const consignor = { id: 'consignor', required: true }

export const placeOfDestination = { id: 'placeOfDestination', required: true }

export const placeOfOrigin = { id: 'placeOfOrigin', required: true }

export const consignee = { id: 'consignee', required: true }

export const importer = { id: 'importer', required: true }

export const obligations = [
  consignor,
  placeOfDestination,
  placeOfOrigin,
  consignee,
  importer
]
