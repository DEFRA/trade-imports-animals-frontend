export const copy = {
  title: 'Your import notifications',
  heading: 'Your import notifications',
  createButton: 'Create a new notification',
  statuses: {
    draft: 'Draft',
    submitted: 'Submitted',
    amend: 'Amend in progress'
  },
  table: {
    headings: {
      reference: 'Reference number',
      status: 'Status',
      origin: 'Origin',
      arrival: 'Arrival',
      created: 'Created',
      submitted: 'Submitted',
      actions: 'Actions'
    }
  },
  actions: {
    continue: 'Continue',
    view: 'View',
    amend: 'Amend',
    resume: 'Resume',
    cancelAmend: 'Cancel amendment',
    forNotification: (reference) => `notification ${reference}`
  },
  filters: {
    heading: 'Filter notifications',
    keywords: {
      label: 'Keywords or reference',
      hint: 'Enter a notification reference number'
    },
    status: {
      label: 'Status',
      all: 'All'
    },
    country: {
      label: 'Country of origin',
      all: 'All',
      groups: {
        uk: 'United Kingdom',
        countries: 'Countries'
      }
    },
    startDate: {
      label: 'Start date range'
    },
    endDate: {
      label: 'End date range'
    },
    date: {
      hint: 'For example, 7 3 2026',
      day: 'Day',
      month: 'Month',
      year: 'Year'
    },
    search: 'Search',
    clear: 'Clear'
  },
  sort: {
    label: 'Sort by',
    apply: 'Apply',
    options: {
      arrivalNewest: 'Arrival (newest to oldest)',
      arrivalOldest: 'Arrival (oldest to newest)',
      createdNewest: 'Date created (newest to oldest)',
      createdOldest: 'Date created (oldest to newest)'
    }
  },
  pagination: {
    results: {
      none: '0 results',
      single: '1 result',
      range: (start, end, total) =>
        `Showing ${start} to ${end} of ${total} results`
    },
    next: 'Next',
    previous: 'Previous'
  },
  search: {
    noResults: 'No notifications found'
  },
  errors: {
    keywordsMax: 'Search term must be 255 characters or fewer',
    startDateReal: 'Start date must be a real date',
    endDateReal: 'End date must be a real date',
    startBeforeEnd: 'The start date must be the same as or before the end date'
  }
}
