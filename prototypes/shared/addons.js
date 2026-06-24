import { updateQuote } from './store.js'
import { dobSchema, integerYearsSchema } from './validate.js'

/**
 * The "select 1-to-N options, each opening its own subtasks" pattern. The driver
 * picks any number of policy add-ons (checkboxes); each chosen add-on then has
 * its own independent mini-journey of steps, tracked separately. Unlike the
 * claims loop (many of the same thing), this fans out into different branches.
 *
 * Per-add-on answers live under quote.addonData[value]; the chosen set is
 * quote.selectedAddons.
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
        schema: dobSchema('driverDob', 'Date of birth'),
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
        schema: integerYearsSchema({
          name: 'ncdYears',
          enterMessage: 'Enter how many years you want to protect',
          noun: 'Years to protect',
          min: 0,
          max: 99
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

export const getSelectedAddons = (quote) => quote.selectedAddons ?? []
export const getAddonData = (quote, value) =>
  (quote.addonData ?? {})[value] ?? {}

export function setSelectedAddons(quote, values) {
  return updateQuote(quote.id, { selectedAddons: values })
}

export function saveAddonStep(quote, value, data) {
  const merged = { ...getAddonData(quote, value), ...data }
  return updateQuote(quote.id, {
    addonData: { ...(quote.addonData ?? {}), [value]: merged }
  })
}

export function stepComplete(step, data) {
  return Boolean(data[step.key])
}

export function addonComplete(quote, value) {
  const addon = addonByValue.get(value)
  const data = getAddonData(quote, value)
  return addon.steps.every((step) => stepComplete(step, data))
}

export function allSelectedAddonsComplete(quote) {
  return getSelectedAddons(quote).every((value) => addonComplete(quote, value))
}

export function selectionItems(quote) {
  const selected = getSelectedAddons(quote)
  return addonOptions.map((addon) => ({
    value: addon.value,
    text: addon.title,
    checked: selected.includes(addon.value)
  }))
}

/** Flat ordered list of every step across selected add-ons (linear journeys). */
export function addonSequence(quote) {
  return getSelectedAddons(quote).flatMap((value) =>
    addonByValue.get(value).steps.map((step) => ({ value, step }))
  )
}

/** A short summary line for an add-on, for the check-answers page. */
export function addonSummary(quote, value) {
  return addonComplete(quote, value) ? 'Added' : 'Started'
}

/**
 * One task-list item per selected add-on, each linking to its own first step —
 * the fan-out, as independent tasks. `firstStepPath(id, value, slug)` builds the
 * variant's URL.
 */
export function addonHubItems(quote, firstStepPath) {
  return getSelectedAddons(quote).map((value) => {
    const addon = addonByValue.get(value)
    return {
      title: { text: addon.title },
      hint: { text: addon.steps.map((step) => step.title).join(', ') },
      href: firstStepPath(quote.id, value, addon.steps[0].slug),
      status: addonComplete(quote, value)
        ? { text: 'Completed' }
        : { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
    }
  })
}
