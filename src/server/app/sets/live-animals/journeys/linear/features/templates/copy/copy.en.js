export const copy = {
  title: 'Manage templates',
  intro: 'Select, manage or create new notification templates',
  createNew: 'Create new template',
  listHeading: 'My templates',
  results: {
    none: 'Show 0 of 0 results',
    all: (total) => `Show 1-${total} of ${total} results`
  },
  card: {
    label: (title) => `Template ${title}`,
    view: 'View template',
    use: 'Use template',
    rows: {
      commodity: 'Commodity',
      origin: 'Origin',
      consignee: 'Consignee',
      consignor: 'Consignor'
    },
    notApplicable: 'Not applicable'
  },
  untitled: 'Untitled template',
  categories: {
    'live-animals': 'Live animals',
    'germinal-products': 'Germinal products'
  },
  saved: {
    title: 'Success',
    heading: (title) => `${title} saved to templates`
  }
}
