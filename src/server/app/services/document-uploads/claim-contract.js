export const REFERENCE_MAX_LENGTH = 58

// The characters a document reference may carry. Alphanumerics plus the
// separators real references use: an air waybill is written 125-12345675, a
// TRACES certificate CHEDA.GB.2026.1234567, and a commercial invoice whatever
// the exporter prints.
export const REFERENCE_PATTERN = /^[A-Za-z0-9 ./-]*$/

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isBlank = (value) => !String(value ?? '').trim()

export const refusedClaimField = ({
  documentType,
  documentReference,
  dateOfIssue
}) => {
  if (isBlank(documentType)) {
    return 'documentType'
  }
  if (
    isBlank(documentReference) ||
    documentReference.length > REFERENCE_MAX_LENGTH ||
    !REFERENCE_PATTERN.test(documentReference)
  ) {
    return 'documentReference'
  }
  if (isBlank(dateOfIssue) || !ISO_DATE_PATTERN.test(dateOfIssue)) {
    return 'dateOfIssue'
  }
  return undefined
}
