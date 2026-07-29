// -----------------------------------------------------------------------------
// System-populated fields — declared for V4 completeness but NOT
// presented in the flow layer. Value legality is enforced upstream
// (system minting for the reference number; gov.identity for the
// responsible person), so both are on `KNOWN_UNWIRED` in
// obligations/coverage.test.js.
// -----------------------------------------------------------------------------

// V4: `GBN-AG-YY-XXXXXX` where XXXXXX is a 6-char Crockford base32
// body (`0-9A-HJKMNP-TV-Z`, no I/L/O/U). System-assigned at
// notification-creation time; never user-entered.
export const poApprovedReferenceNumber = {
  id: '9a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
  name: 'poApprovedReferenceNumber',
  status: 'mandatory'
}

// V4: Consumed from gov.identity on authentication. Composite:
// { person, telephone, email, orgName, orgAddress, orgTelephone }.
// gov.identity guarantees the shape upstream.
export const responsiblePersonForLoad = {
  id: 'ab0c1d2e-3f4a-4b5c-8d6e-7f8a9b0c1d2e',
  name: 'responsiblePersonForLoad',
  status: 'mandatory'
}
