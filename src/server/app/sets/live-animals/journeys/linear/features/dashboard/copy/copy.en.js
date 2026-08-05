export const copy = {
  title: 'Import notification service',
  body:
    'Use this service to tell the authorities about live animals ' +
    'you are importing. You will answer a short set of questions ' +
    'about the consignment, then submit your notification.',
  startButton: 'Start a new notification',
  notificationsHeading: 'Your notifications',
  search: {
    heading: 'Filter notifications',
    label: 'Keyword or reference',
    button: 'Search',
    noResults: 'No notifications found'
  },
  table: {
    reference: 'Reference',
    status: 'Status',
    commodity: 'Commodity',
    origin: 'Origin',
    arrival: 'Arrival at destination',
    consignor: 'Consignor',
    consignee: 'Consignee',
    created: 'Date created',
    submitted: 'Date submitted',
    actions: 'Actions'
  },
  sort: {
    label: 'Sort by',
    update: 'Update sort',
    options: {
      arrivalNewest: 'Arrival (newest to oldest)',
      arrivalOldest: 'Arrival (oldest to newest)',
      createdNewest: 'Date created (newest to oldest)',
      createdOldest: 'Date created (oldest to newest)'
    }
  },
  pagination: {
    previous: 'Previous',
    next: 'Next',
    results: {
      none: 'No Results',
      one: 'Showing 1 Result',
      oneOf: (item, total) => `Showing ${item} of ${total} Results`,
      many: (start, end, total) =>
        `Showing ${start} to ${end} of ${total} Results`
    }
  },
  notSubmitted: 'Not submitted',
  actions: {
    view: 'View',
    amend: 'Amend',
    resume: 'Resume',
    cancelAmend: 'Cancel amendment'
  },
  actionHidden: (reference) => `notification ${reference}`,
  emptyText: 'You have not started any notifications in this session.'
}
