/**
 * The input-types reference journey: a sequence of pages, each exercising a
 * cluster of GDS input components via the shared field engine. Throwaway — a
 * worked example of how each input looks, is hinted and (on the errors page)
 * shows validation.
 */

export const pages = [
  {
    slug: 'text',
    title: 'Text and patterned inputs',
    fields: [
      { kind: 'text', name: 'fullName', label: 'Full name' },
      {
        kind: 'email',
        name: 'email',
        label: 'Email address',
        hint: 'We’ll only use this to send your quote'
      },
      {
        kind: 'tel',
        name: 'phone',
        label: 'UK telephone number',
        hint: 'For international numbers include the country code'
      },
      { kind: 'postcode', name: 'postcode', label: 'Postcode' },
      {
        kind: 'text',
        name: 'registration',
        label: 'Vehicle registration number',
        hint: 'For example, AB12 CDE'
      },
      {
        kind: 'text',
        name: 'nino',
        label: 'National Insurance number',
        hint: 'It’s on your payslip, for example QQ 12 34 56 C'
      }
    ]
  },
  {
    slug: 'numbers',
    title: 'Numbers and money',
    fields: [
      { kind: 'number', name: 'passengers', label: 'Number of passengers' },
      {
        kind: 'currency',
        name: 'vehicleValue',
        label: 'Estimated vehicle value'
      }
    ]
  },
  {
    slug: 'dates-and-text',
    title: 'Dates and longer text',
    fields: [
      {
        kind: 'date',
        name: 'dob',
        label: 'Date of birth',
        hint: 'For example, 27 3 1985'
      },
      {
        kind: 'textarea',
        name: 'description',
        label: 'Describe any modifications',
        hint: 'Do not include personal or financial information',
        maxlength: 200
      }
    ]
  },
  {
    slug: 'choosing',
    title: 'Choosing from options',
    fields: [
      {
        kind: 'radios',
        name: 'coverType',
        label: 'Level of cover',
        options: [
          { value: 'comprehensive', text: 'Comprehensive' },
          { value: 'tpft', text: 'Third party, fire and theft' },
          { value: 'tp', text: 'Third party only' }
        ]
      },
      {
        kind: 'radios',
        name: 'hadClaims',
        label: 'Have you had any claims in the last 5 years?',
        options: [
          { value: 'yes', text: 'Yes' },
          { value: 'no', text: 'No' }
        ]
      },
      {
        kind: 'checkboxes',
        name: 'extras',
        label: 'Optional extras',
        options: [
          { value: 'breakdown', text: 'Breakdown cover' },
          { value: 'courtesy-car', text: 'Courtesy car' },
          { value: 'legal', text: 'Motor legal protection' }
        ]
      },
      {
        kind: 'select',
        name: 'country',
        label: 'Country of residence',
        options: [
          { value: 'england', text: 'England' },
          { value: 'scotland', text: 'Scotland' },
          { value: 'wales', text: 'Wales' },
          { value: 'northern-ireland', text: 'Northern Ireland' }
        ]
      }
    ]
  }
]

export const pageBySlug = new Map(pages.map((page) => [page.slug, page]))

// Static example errors, shown on the dedicated validation page.
export const errorFields = [
  {
    kind: 'text',
    name: 'fullNameErr',
    label: 'Full name',
    error: 'Enter your full name'
  },
  {
    kind: 'date',
    name: 'dobErr',
    label: 'Date of birth',
    hint: 'For example, 27 3 1985',
    error: 'Date of birth must include a month'
  },
  {
    kind: 'radios',
    name: 'coverErr',
    label: 'Level of cover',
    options: [
      { value: 'comprehensive', text: 'Comprehensive' },
      { value: 'tpft', text: 'Third party, fire and theft' }
    ],
    error: 'Select a level of cover'
  }
]

/** All fields across the journey, for the review page. */
export const allFields = pages.flatMap((page) => page.fields)
