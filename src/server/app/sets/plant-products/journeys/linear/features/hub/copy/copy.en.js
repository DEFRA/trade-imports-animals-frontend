export const copy = {
  title: 'Notification overview',
  intro:
    'These sections can be completed in any order. You can save your progress and return at any time.',
  returnToDashboard: 'Return to dashboard',
  statuses: {
    completed: 'Completed',
    optional: 'Optional',
    inProgress: 'In progress',
    notYetStarted: 'Not yet started',
    cannotStartYet: 'Cannot start yet'
  },
  groups: {
    origin: '1. Origin of the import',
    purpose: '2. Purpose',
    commodities: '3. Commodity',
    'additional-details': '4. Additional details',
    transport: '5. Transport to the BCP',
    'goods-movement': '6. Goods movement services',
    contact: '7. Contact details',
    documents: '9. Accompanying documents',
    traders: '10. Traders',
    review: '12. Review and submit'
  },
  rows: {
    origin: {
      title: 'Origin of the import',
      hint: 'Where the consignment comes from and your internal reference'
    },
    purpose: {
      title: 'Purpose',
      hint: 'The main reason for importing the consignment'
    },
    commodities: {
      title: 'Commodity',
      hint: 'The commodities, species and quantities you are importing'
    },
    'additional-details': {
      title: 'Additional details',
      hint: 'Total gross weight and volume of the consignment'
    },
    transport: {
      title: 'Transport to the BCP',
      hint: 'How the consignment will travel to the border control post'
    },
    goodsMovement: {
      title: 'Goods movement services',
      hint: 'Common Transit Convention, Movement Reference Number and GVMS'
    },
    contact: {
      title: 'Contact details',
      hint: 'Details we can use if your consignment is chosen for inspection'
    },
    documents: {
      title: 'Accompanying documents',
      hint: 'Add at least one document, including the phytosanitary certificate'
    },
    traders: {
      title: 'Traders',
      hint: 'Importer, delivery address, packer and consignor details'
    },
    review: {
      title: 'Review and submit',
      hint: 'Check your answers before you submit the notification'
    }
  }
}
