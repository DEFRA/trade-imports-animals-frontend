import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  maxText,
  pattern,
  requiredOneOf,
  requiredText,
  validate
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import * as addressBook from '../../../../../services/address-book/index.js'
import { writeSelection } from '../../../../../services/address-book/session-store.js'
import {
  COUNTRIES,
  countryOptions,
  ukSubdivisionOptions
} from '../../../../../services/reference/countries.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { consignorCreatePage as page, consignorPickerPage } from '../page.js'

export const meta = {
  ...page,
  collects: [
    'consignorName',
    'consignorAddressLine1',
    'consignorAddressLine2',
    'consignorAddressLine3',
    'consignorCity',
    'consignorPostcode',
    'consignorTelephone',
    'consignorCountry',
    'consignorEmail'
  ]
}

const view = `${TEMPLATES}/features/traders/consignor-create/consignor-create`
const copy = copyFor({ en, cy }).consignorCreate
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COUNTRY_LIST_DIVIDER = '──────────'

const fieldRules = (countryCodes) => [
  requiredText('consignorName', copy.errors.consignorName.required),
  maxText('consignorName', 255, copy.errors.consignorName.max),
  requiredText(
    'consignorAddressLine1',
    copy.errors.consignorAddressLine1.required
  ),
  maxText('consignorAddressLine1', 255, copy.errors.consignorAddressLine1.max),
  maxText('consignorAddressLine2', 255, copy.errors.consignorAddressLine2.max),
  maxText('consignorAddressLine3', 255, copy.errors.consignorAddressLine3.max),
  requiredText('consignorCity', copy.errors.consignorCity.required),
  maxText('consignorCity', 58, copy.errors.consignorCity.max),
  maxText('consignorPostcode', 32, copy.errors.consignorPostcode.max),
  requiredText('consignorTelephone', copy.errors.consignorTelephone.required),
  maxText('consignorTelephone', 30, copy.errors.consignorTelephone.max),
  requiredOneOf(
    'consignorCountry',
    countryCodes,
    copy.errors.consignorCountry.required
  ),
  requiredText('consignorEmail', copy.errors.consignorEmail.required),
  pattern('consignorEmail', EMAIL, copy.errors.consignorEmail.format),
  maxText('consignorEmail', 255, copy.errors.consignorEmail.max)
]

const validateFields = (payload, countryCodes) => {
  const results = fieldRules(countryCodes).map((rule) =>
    validate(rule, payload)
  )
  const errors = results.reduce((combined, result) => {
    for (const [field, message] of Object.entries(result.errors ?? {})) {
      if (combined[field] === undefined) combined[field] = message
    }
    return combined
  }, {})
  return Object.keys(errors).length > 0 ? errors : null
}

const valueFields = meta.collects

const valuesFrom = (source) =>
  Object.fromEntries(valueFields.map((field) => [field, source[field] ?? '']))

const countryItems = (selected) => {
  const withSelected = (option) => ({
    ...option,
    selected: option.value === selected
  })
  return [
    {
      value: '',
      text: copy.fields.consignorCountry.placeholder,
      selected: selected === ''
    },
    ...ukSubdivisionOptions().map(withSelected),
    { value: '', text: COUNTRY_LIST_DIVIDER, disabled: true },
    ...countryOptions().map(withSelected)
  ]
}

const render = (
  h,
  journey,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.pageTitle, {
      backLink: pagePath(journey.journeyId, consignorPickerPage.slug),
      journey,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems(values.consignorCountry)
  })

// Arriving from the picker's 'Add a consignor or exporter' means adding, so the
// form opens blank. Only a check-answers Change link, which carries the change
// marker, prefills what is already on the notification.
const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(
    h,
    journey,
    kit.changeContext(request) ? valuesFrom(answers) : valuesFrom({})
  )
}

const optionalValue = (value) => value || undefined

const cleanedValues = (values) => ({
  consignorName: values.consignorName.trim(),
  consignorAddressLine1: values.consignorAddressLine1.trim(),
  consignorAddressLine2: optionalValue(values.consignorAddressLine2.trim()),
  consignorAddressLine3: optionalValue(values.consignorAddressLine3.trim()),
  consignorCity: values.consignorCity.trim(),
  consignorPostcode: optionalValue(values.consignorPostcode.trim()),
  consignorTelephone: values.consignorTelephone.trim(),
  consignorCountry: values.consignorCountry.trim(),
  consignorEmail: values.consignorEmail.trim()
})

const addressBookRecord = (values) => ({
  name: values.consignorName,
  telephone: values.consignorTelephone,
  email: values.consignorEmail,
  address: {
    addressLine1: values.consignorAddressLine1,
    addressLine2: values.consignorAddressLine2 ?? '',
    addressLine3: values.consignorAddressLine3 ?? '',
    city: values.consignorCity,
    postcode: values.consignorPostcode ?? '',
    country: values.consignorCountry
  }
})

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const pageState = await state.get(request, h)
  const rawValues = valuesFrom(payload)
  const countryCodes = COUNTRIES.map(({ code }) => code)
  const errors = validateFields(payload, countryCodes)
  if (errors) {
    return render(h, pageState.journey, rawValues, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const cleaned = cleanedValues(rawValues)
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, cleaned)
    },
    () =>
      render(h, pageState.journey, rawValues, {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  if (!kit.changeContext(request)) {
    const saved = await addressBook.add(request, addressBookRecord(cleaned))
    writeSelection(request, pageState.journey.journeyId, saved.id)
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
