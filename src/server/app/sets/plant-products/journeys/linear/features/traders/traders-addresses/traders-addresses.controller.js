import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  compose,
  maxText,
  oneOf,
  requiredOneOf,
  requiredText,
  validate
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { placeholderOrganisationOperator } from '../../../../../services/placeholder-org.js'
import {
  countryLabel,
  countryOptions,
  ukSubdivisionOptions
} from '../../../../../services/reference/countries.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { tradersAddressesPage as page } from '../page.js'

export const meta = {
  ...page,
  collects: [
    'destinationSameAsConsignee',
    'destinationName',
    'destinationAddressLine1',
    'destinationAddressLine2',
    'destinationAddressLine3',
    'destinationCity',
    'destinationPostcode',
    'destinationCountry',
    'packerName',
    'packerAddressLine1',
    'packerAddressLine2',
    'packerAddressLine3',
    'packerCity',
    'packerPostcode',
    'packerCountry'
  ]
}

const view = `${TEMPLATES}/features/traders/traders-addresses/traders-addresses`
const copy = copyFor({ en, cy }).tradersAddresses
const UK_SUBDIVISION_OPTIONS = ukSubdivisionOptions()
const ADDRESS_COUNTRY_OPTIONS = Object.freeze([
  ...UK_SUBDIVISION_OPTIONS,
  ...countryOptions()
])
const ADDRESS_COUNTRY_CODES = Object.freeze(
  ADDRESS_COUNTRY_OPTIONS.map(({ value }) => value)
)
const COUNTRY_LIST_DIVIDER = '──────────'

const destinationFields = [
  'destinationName',
  'destinationAddressLine1',
  'destinationAddressLine2',
  'destinationAddressLine3',
  'destinationCity',
  'destinationPostcode',
  'destinationCountry'
]

const packerFields = [
  'packerName',
  'packerAddressLine1',
  'packerAddressLine2',
  'packerAddressLine3',
  'packerCity',
  'packerPostcode',
  'packerCountry'
]

const textFields = [
  'destinationName',
  'destinationAddressLine1',
  'destinationAddressLine2',
  'destinationAddressLine3',
  'destinationCity',
  'destinationPostcode',
  'packerName',
  'packerAddressLine1',
  'packerAddressLine2',
  'packerAddressLine3',
  'packerCity',
  'packerPostcode'
]

const valuesFrom = (source) => ({
  destinationSameAsConsignee:
    source.destinationSameAsConsignee === true
      ? 'true'
      : source.destinationSameAsConsignee === false
        ? 'false'
        : '',
  ...Object.fromEntries(
    [...destinationFields, ...packerFields].map((field) => [
      field,
      source[field] ?? ''
    ])
  )
})

const rawValuesFrom = (payload) => ({
  destinationSameAsConsignee:
    payload.destinationSameAsConsignee === 'true' ||
    payload.destinationSameAsConsignee === 'false'
      ? payload.destinationSameAsConsignee
      : '',
  ...Object.fromEntries(
    [...destinationFields, ...packerFields].map((field) => [
      field,
      payload[field] ?? ''
    ])
  )
})

const selectItems = (selected) => {
  const selectableItems = ADDRESS_COUNTRY_OPTIONS.map((option) => ({
    ...option,
    selected: option.value === selected
  }))
  return [
    {
      value: '',
      text: copy.countryPlaceholder,
      selected: selected === ''
    },
    ...selectableItems.slice(0, UK_SUBDIVISION_OPTIONS.length),
    { value: '', text: COUNTRY_LIST_DIVIDER, disabled: true },
    ...selectableItems.slice(UK_SUBDIVISION_OPTIONS.length)
  ]
}

const importerRows = () => {
  const importer = placeholderOrganisationOperator()
  const address = importer.address
  return [
    {
      key: { text: copy.importer.rows.name },
      value: { text: importer.name }
    },
    {
      key: { text: copy.importer.rows.address },
      value: {
        text: [
          address.addressLine1,
          address.addressLine2,
          address.addressLine3,
          address.city,
          address.postcode
        ]
          .filter(Boolean)
          .join(', ')
      }
    },
    {
      key: { text: copy.importer.rows.country },
      value: { text: countryLabel(address.country) ?? address.country }
    }
  ]
}

const render = (
  h,
  journey,
  values,
  { consignorName = '', errors = {}, recoverableError = false } = {}
) => {
  const base = kit.base(copy.heading, {
    backLink: hubPath(journey.journeyId),
    journey,
    recoverableError
  })
  return h.view(view, {
    ...base,
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    importerRows: importerRows(),
    destinationCountryItems: selectItems(values.destinationCountry),
    packerCountryItems: selectItems(values.packerCountry),
    consignorName,
    consignorHref: pagePath(journey.journeyId, 'consignor-create')
  })
}

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, valuesFrom(answers), {
    consignorName: answers.consignorName
  })
}

const fields = (destinationInScope, countryCodes) =>
  compose(
    requiredOneOf(
      'destinationSameAsConsignee',
      ['true', 'false'],
      copy.errors.destinationSameAsConsignee
    ),
    oneOf('packerCountry', countryCodes),
    ...(destinationInScope
      ? [
          requiredText('destinationName', copy.errors.destinationName),
          requiredText(
            'destinationAddressLine1',
            copy.errors.destinationAddressLine1
          ),
          requiredText('destinationCity', copy.errors.destinationCity),
          requiredText('destinationPostcode', copy.errors.destinationPostcode),
          requiredOneOf(
            'destinationCountry',
            countryCodes,
            copy.errors.destinationCountry
          )
        ]
      : [oneOf('destinationCountry', countryCodes)])
  )

const validateFields = (payload, destinationInScope, countryCodes) => {
  const results = [
    validate(fields(destinationInScope, countryCodes), payload),
    ...textFields.map((field) => validate(maxText(field, 255), payload))
  ]
  const errors = results.reduce((combined, result) => {
    for (const [field, message] of Object.entries(result.errors ?? {})) {
      if (combined[field] === undefined) combined[field] = message
    }
    return combined
  }, {})
  return Object.keys(errors).length > 0 ? errors : null
}

const optionalValue = (value) => value || undefined

const cleanedValues = (values, destinationInScope) => ({
  destinationSameAsConsignee: values.destinationSameAsConsignee === 'true',
  ...(destinationInScope
    ? {
        destinationName: values.destinationName.trim(),
        destinationAddressLine1: values.destinationAddressLine1.trim(),
        destinationAddressLine2: optionalValue(
          values.destinationAddressLine2.trim()
        ),
        destinationAddressLine3: optionalValue(
          values.destinationAddressLine3.trim()
        ),
        destinationCity: values.destinationCity.trim(),
        destinationPostcode: values.destinationPostcode.trim(),
        destinationCountry: values.destinationCountry.trim()
      }
    : {}),
  ...Object.fromEntries(
    packerFields.map((field) => [
      field,
      optionalValue(String(values[field] ?? '').trim())
    ])
  )
})

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const pageState = await state.get(request, h)
  const rawValues = rawValuesFrom(payload)
  const proposedAnswer =
    rawValues.destinationSameAsConsignee === 'true'
      ? true
      : rawValues.destinationSameAsConsignee === 'false'
        ? false
        : undefined
  const proposedScope = state.makeScope({
    ...pageState.answers,
    destinationSameAsConsignee: proposedAnswer
  })
  const destinationInScope = proposedScope.has('destinationName')
  const errors = validateFields(
    payload,
    destinationInScope,
    ADDRESS_COUNTRY_CODES
  )
  if (errors) {
    return render(h, pageState.journey, rawValues, {
      consignorName: pageState.answers.consignorName,
      errors
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  const cleaned = cleanedValues(rawValues, destinationInScope)
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, cleaned)
    },
    () =>
      render(h, pageState.journey, rawValues, {
        consignorName: pageState.answers.consignorName,
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
