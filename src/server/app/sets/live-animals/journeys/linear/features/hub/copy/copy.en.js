export const copy = {
  title: 'Overview',
  commodityTotals: {
    heading: 'Your commodities',
    animalsLabel: 'Animals',
    animalsCaption: 'Total number of animals in this consignment',
    packagesLabel: 'Packages/boxes',
    packagesCaption: 'Total number of packages in this consignment'
  },
  reviewAndSubmit: 'Review and submit',
  returnToDashboard: 'Return to dashboard',
  // Design release 1 tags a task with one of two words and no others:
  // "Complete" when the task is finished, "To do" everywhere else. It draws no
  // part-done state, and never tells a trader on the hub that a task is
  // optional.
  statuses: {
    complete: 'Complete',
    toDo: 'To do'
  },
  taskListHeading: 'Notification tasklist',
  groups: {
    'about-the-consignment': '1. About the consignment',
    'description-of-the-goods': '2. Description of the goods',
    'transport-and-arrival': '3. Transport and arrival',
    documents: '4. Documents',
    'consignment-parties': '5. Consignment parties',
    'contact-address': '6. Contact address'
  },
  // Design release 1 keeps the hub compact: nine of its ten rows are a bare
  // link with a status tag beside it, and only "Roles and addresses" carries a
  // sentence underneath naming the parties it collects.
  rows: {
    origin: {
      title: 'Where is this consignment coming from?'
    },
    commodities: {
      title: 'What are you importing?'
    },
    importReason: {
      title: 'Main reason for import'
    },
    consignmentDetails: {
      title: 'Commodity details'
    },
    additionalDetails: {
      title: 'Additional details'
    },
    animalIdentification: {
      title: 'Identification details'
    },
    arrivalDetails: {
      title: 'Arrival details'
    },
    transitCountries: {
      title: 'Transit countries'
    },
    transporter: {
      title: 'Transport details'
    },
    addresses: {
      title: 'Roles and addresses',
      hint: 'Consignor or Exporter, Consignee, Importer and Place of Destination'
    },
    contact: {
      title: 'Contact address for this consignment'
    },
    documents: {
      title: 'Upload documents'
    }
  }
}
