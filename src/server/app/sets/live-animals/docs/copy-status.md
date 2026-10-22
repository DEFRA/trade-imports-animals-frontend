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
