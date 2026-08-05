export const documentTypeOptions = Object.freeze([
  { value: 'AIR_WAYBILL', text: 'Air waybill' },
  { value: 'COMMERCIAL_INVOICE', text: 'Commercial invoice' },
  { value: 'CARGO_MANIFEST', text: 'Cargo manifest' },
  { value: 'INSPECTION_CERTIFICATE', text: 'Inspection certificate' },
  { value: 'PHYTOSANITARY_CERTIFICATE', text: 'Phytosanitary certificate' },
  { value: 'IMPORT_PERMIT', text: 'Import permit' },
  { value: 'ORIGIN_CERTIFICATE', text: 'Origin certificate' },
  {
    value: 'LETTER_OF_AUTHORITY',
    text: 'Letter of authority (Directive 2008/61/EC)'
  },
  {
    value: 'HEAT_TREATMENT_CERTIFICATE',
    text: 'Heat treatment certificate'
  },
  { value: 'CONTAINER_MANIFEST', text: 'Container manifest' },
  { value: 'SEA_WAYBILL', text: 'Sea waybill' },
  { value: 'RAIL_WAYBILL', text: 'Rail waybill' },
  { value: 'CUSTOMS_DECLARATION', text: 'Customs declaration' },
  { value: 'BILL_OF_LADING', text: 'Bill of lading' },
  { value: 'CONFORMITY_CERTIFICATE', text: 'Conformity certificate' },
  { value: 'OTHER', text: 'Other' }
])

export const documentTypeLabel = (code) =>
  documentTypeOptions.find(({ value }) => value === code)?.text
