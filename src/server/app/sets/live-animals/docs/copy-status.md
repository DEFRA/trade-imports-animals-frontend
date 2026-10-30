# Copy that has not been through a content review

The dashboard's Welsh copy is a machine draft that a translator has not
reviewed. Do not ship it to users without Welsh Language Standards sign-off.

The commodities feature's Welsh is also a machine draft. It writes counts in
the simple numeric style rather than risk wrong mutations. A translator must
review the count and pluralisation strings in
`journeys/linear/features/commodities/copy/copy.cy.js`, which are written as
functions.

The transporter list's Welsh "shown count" message is a machine draft too. A
translator must review its singular and plural wording in
`journeys/linear/features/transport/copy/copy.cy.js`, which is a function of
the count.

The address pickers' Welsh results count is a machine draft as well. A
translator must review it in
`journeys/linear/features/addresses/copy/copy.cy.js`, where it is a function of
the number shown and the total.

The declaration's Welsh responsibility bullets both complete the "nes iddo naill
ai:" lead-in, so both take the soft-mutated form: glirio (clirio) and gyrraedd
(cyrraedd). A translator must review them in
`journeys/linear/features/declaration/copy/copy.cy.js`.

The Welsh document-type labels are machine drafts. A translator must review all
thirteen in `journeys/linear/features/documents/copy/copy.cy.js`, which the
upload page and the review page both read. The ones carrying a slash need the
most attention: each joins two document names the English list pairs, and Welsh
mutation after the joiner has not been checked.
