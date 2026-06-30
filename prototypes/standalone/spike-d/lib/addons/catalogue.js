import {
  currencySchema,
  dobSchema,
  integerYearsSchema
} from '../validate/index.js'

/**
 * The add-on policy catalogue: each add-on is a chosen branch with its own
 * independent mini-journey of steps. Per-add-on answers live under
 * `quote.addonData[value]`; the chosen set is `quote.selectedAddons`.
 */

export const addonOptions = [
  {
    value: 'named-driver',
    title: 'Add a named driver',
    steps: [
      {
        slug: 'who',
        title: 'Named driver',
        key: 'driverName',
        schema: dobSchema('driverDob', 'Date of birth', { required: false }),
        fields: [
          { kind: 'text', name: 'driverName', label: 'Full name' },
          {
            kind: 'date',
            name: 'driverDob',
            label: 'Date of birth',
            hint: 'For example, 27 3 1985'
          }
        ]
      },
      {
        slug: 'relationship',
        title: 'Relationship to you',
        key: 'relationship',
        fields: [
          {
            kind: 'radios',
            name: 'relationship',
            label: 'What is their relationship to you?',
            options: [
              { value: 'spouse', text: 'Spouse or partner' },
              { value: 'child', text: 'Son or daughter' },
              { value: 'parent', text: 'Parent' },
              { value: 'other', text: 'Someone else' }
            ]
          }
        ]
      }
    ]
  },
  {
    value: 'modifications',
    title: 'Declare vehicle modifications',
    steps: [
      {
        slug: 'describe',
        title: 'Describe the modifications',
        key: 'modDescription',
        fields: [
          {
            kind: 'textarea',
            name: 'modDescription',
            label: 'Describe the modifications',
            hint: 'For example, alloy wheels or a remapped engine',
            maxlength: 200
          }
        ]
      },
      {
        slug: 'value',
        title: 'Value of the modifications',
        key: 'modValue',
        schema: currencySchema({
          name: 'modValue',
          enterMessage: 'Enter the approximate value',
          formatMessage:
            'Modification value must be a whole number of pounds greater than 0, like 1500'
        }),
        fields: [
          {
            kind: 'currency',
            name: 'modValue',
            label: 'Approximate value added'
          }
        ]
      }
    ]
  },
  {
    value: 'protected-ncd',
    title: 'Protect your no-claims discount',
    steps: [
      {
        slug: 'years',
        title: 'Protect your no-claims discount',
        key: 'ncdYears',
        // The user only reaches this step after selecting "Protect your
        // no-claims discount" on the add-ons hub, so saying yes implies they
        // must specify how many years (and zero would defeat the purpose of
        // the add-on). Required, minimum 1.
        schema: integerYearsSchema({
          name: 'ncdYears',
          enterMessage: 'Enter how many years you want to protect',
          noun: 'Years to protect',
          min: 1,
          max: 99,
          required: true
        }),
        fields: [
          {
            kind: 'number',
            name: 'ncdYears',
            label: 'How many years do you want to protect?'
          }
        ]
      }
    ]
  }
]

export const addonByValue = new Map(
  addonOptions.map((addon) => [addon.value, addon])
)
