/** The fixed commercial-transporter list.
 *
 * Not address-book data. A transporter carries an `approvalNumber` and the
 * address book has no field for one (EUDPA-294, D13 scopes that ticket to the
 * consignment party), so this list stays local until a ticket extends the
 * address-book contract to represent transporters. */
export const COMMERCIAL_TRANSPORTER_OPTIONS = [
  {
    id: 'garcia-livestock-transport',
    name: 'García Livestock Transport SL',
    approvalNumber: 'ES-T2-45001294',
    address: {
      addressLine1: '43 East Hague Extension',
      addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
      addressLine3: 'Quasoccaecat ut ear, 30055',
      country: 'Switzerland'
    }
  },
  {
    id: 'j-and-g-campbell',
    name: 'J & G Campbell LTD',
    approvalNumber: 'UK/BURY/T2/00104115',
    address: {
      addressLine1: 'Rue de la Loi 200',
      addressLine2: '1040 Brussels',
      country: 'Belgium'
    }
  }
]
