import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'

export const copy = {
  hub: {
    title: 'Consignment addresses',
    intro: 'Add all the addresses that are involved in the consignment.',
    warning: 'Providing a false address is an act of fraud',
    change: 'Change',
    editDetails: 'Edit details',
    cph: {
      title: 'County parish holding (CPH) number',
      hint: 'The county parish holding (CPH) number identifies the holding where the animals will be kept.',
      add: 'Add a CPH number'
    }
  },
  parties: {
    placeOfOrigin: {
      title: 'Place of origin',
      hint: 'The address where the animals begin their journey to Great Britain',
      add: 'Add a place of origin',
      error: 'Select a place of origin from the list'
    },
    consignor: {
      title: 'Consignor',
      hint: 'This is the sender of the consignment.',
      add: 'Add a consignor',
      error: 'Select a consignor from the list'
    },
    consignee: {
      title: 'Consignee',
      hint: 'This is the receiver or buyer of the consignment being shipped or transported.',
      add: 'Add a consignee',
      error: 'Select a consignee from the list'
    },
    importer: {
      title: 'Importer',
      hint: 'This is usually the same as the consignee. You can select a different person if needed.',
      add: 'Add an importer',
      error: 'Select an importer from the list'
    },
    placeOfDestination: {
      title: 'Place of destination',
      hint: 'This is where the animals will be unloaded and accommodated for at least 48 hours. If a health certificate is required, it will show this address.',
      add: 'Add a place of destination',
      error: 'Select a place of destination from the list'
    }
  },
  picker: {
    caption: 'Consignment parties',
    search: {
      label: 'Search',
      hint: 'Name, address or country',
      button: 'Search'
    },
    selectedAddressPrefix: 'Selected address:',
    errorPrefix: 'Error:',
    noMatches: 'No addresses match your search.',
    resultsHeading: 'Select an address',
    resultsCount: (shown, total) => `Showing ${shown} out of ${total} results`,
    table: {
      selectHidden: 'Select',
      name: 'Name',
      address: 'Address',
      country: 'Country',
      actionsHidden: 'Actions'
    },
    selectRowPrefix: 'Select',
    viewDetails: 'View details',
    viewDetailsFor: 'for',
    addNewAddress: sharedCopy.addressHandshake.addNewAddress,
    handshakeErrors: sharedCopy.addressHandshake.errors
  }
}
