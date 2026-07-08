// Vendored MDM document/attachment types — the swap point when the real reference-data service lands.

// The V4 fourteen-entry document-type enum, verbatim (spec ruling c-010: V4
// wins over the skeleton's two-type shortcut).
export const DOCUMENT_TYPE_OPTIONS = [
  'ITAHC',
  'Veterinary health certificate',
  'Air waybill',
  'Import permit',
  'Letter of authority (Directive 2008/61/EC)',
  'Commercial invoice',
  'Sea waybill',
  'Rail waybill',
  'Bill of lading',
  'Catch certificate',
  'Laboratory sampling results for aflatoxin (Reg 2019/1793)',
  'Health certificate',
  'Journey log',
  'Other'
]

// V4 models the attachment as a user-selected file-format enum; the real
// service uploads a file instead (spec ruling c-004: files persist by
// reference in a separate store). This prototype records metadata only.
export const ATTACHMENT_TYPE_OPTIONS = [
  'PDF',
  'DOC',
  'DOCX',
  'JPG',
  'JPEG',
  'PNG',
  'XLS',
  'XLSX'
]
