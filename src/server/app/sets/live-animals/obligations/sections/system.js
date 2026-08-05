// -----------------------------------------------------------------------------
// System-populated fields — declared for V4 completeness but NOT
// presented in the flow layer. Value legality is enforced upstream,
// so these are on `KNOWN_UNWIRED` in obligations/coverage.test.js.
// -----------------------------------------------------------------------------

// V4: `GBN-AG-YY-XXXXXX` where XXXXXX is a 6-char Crockford base32
// body (`0-9A-HJKMNP-TV-Z`, no I/L/O/U). System-assigned at
// notification-creation time; never user-entered.
export const poApprovedReferenceNumber = {
  id: '9a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
  name: 'poApprovedReferenceNumber',
  status: 'mandatory'
}
