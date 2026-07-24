export const copy = {
  title: 'Import notification service',
  body:
    'Use this service to tell the authorities about live animals ' +
    'you are importing. You will answer a short set of questions ' +
    'about the consignment, then submit your notification.',
  startButton: 'Start a new notification',
  notificationsHeading: 'Your notifications',
  table: {
    reference: 'Reference',
    status: 'Status',
    created: 'Date created',
    submitted: 'Date submitted',
    actions: 'Actions'
  },
  notSubmitted: 'Not submitted',
  actions: {
    view: 'View',
    amend: 'Amend',
    resume: 'Resume'
  },
  actionHidden: (reference) => `notification ${reference}`,
  emptyText: 'You have not started any notifications in this session.'
}
