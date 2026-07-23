import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as countries from '../../services/countries/index.js'
import * as commodities from '../../services/commodities/index.js'
import { animalIdentificationPage as page } from './page.js'
import { appliesForCommodity } from '../../bridge/applicability.js'
import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/animal-identification`

const copy = copyFor({ en, cy }).identification
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

export const IDENTIFIER_LABELS = copy.identifierLabels

export const animalIdentifierSummary = (unit) => {
  const parts = Object.entries(IDENTIFIER_LABELS)
    .filter(([id]) => (unit[id] ?? '').toString().trim() !== '')
    .map(([id, label]) => `${label}: ${unit[id]}`)
  if (unit.permanentAddress?.name) {
    parts.push(
      `${copy.permanentAddressSummaryLabel}: ${unit.permanentAddress.name}`
    )
  }
  return parts.length ? parts.join(', ') : copy.noIdentifier
}

const toFields = (byId) =>
  Object.entries(byId).map(([id, field]) => ({ id, ...field }))

const TYPE_FIELDS = toFields(copy.typeFields)

const FALLBACK_FIELDS = toFields(copy.fallbackFields)

const IDENTIFIER_MAX_MESSAGES = copy.errors.identifierMax

const ADDRESS_MANDATORY_MESSAGES = copy.errors.addressMandatory

const ADDRESS_FIELD_ORDER = [
  'nameOrOrganisationName',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postalOrZipCode',
  'country',
  'telephoneNumber',
  'emailAddress'
]

const ADDRESS_LINE_MAX_LENGTH = 255
const TOWN_OR_COUNTY_MAX_LENGTH = 100
const POSTCODE_MAX_LENGTH = 12
const TELEPHONE_MAX_LENGTH = 20
const EMAIL_MAX_LENGTH = 254

const fieldName = (id, index) => `${id}-${index}`

const scopedTypeFields = (commodity) =>
  TYPE_FIELDS.filter((field) => appliesForCommodity(field.id, commodity))

const scopedFallbackFields = (commodity) =>
  FALLBACK_FIELDS.filter((field) => appliesForCommodity(field.id, commodity))

const scopedFields = (commodity) => [
  ...scopedTypeFields(commodity),
  ...scopedFallbackFields(commodity)
]

const permanentAddressApplies = (commodity) =>
  appliesForCommodity('permanentAddress', commodity)

const identifierChecksFor = (commodity, index) =>
  compose(
    ...scopedFields(commodity).map((field) =>
      maxText(fieldName(field.id, index), 58, IDENTIFIER_MAX_MESSAGES[field.id])
    )
  )

const addressChecksFor = (index) =>
  compose(
    maxText(
      fieldName('nameOrOrganisationName', index),
      ADDRESS_LINE_MAX_LENGTH,
      copy.errors.addressFormat.nameOrOrganisationName
    ),
    maxText(
      fieldName('addressLine1', index),
      ADDRESS_LINE_MAX_LENGTH,
      copy.errors.addressFormat.addressLine1
    ),
    maxText(
      fieldName('addressLine2', index),
      ADDRESS_LINE_MAX_LENGTH,
      copy.errors.addressFormat.addressLine2
    ),
    maxText(
      fieldName('townOrCity', index),
      TOWN_OR_COUNTY_MAX_LENGTH,
      copy.errors.addressFormat.townOrCity
    ),
    maxText(
      fieldName('county', index),
      TOWN_OR_COUNTY_MAX_LENGTH,
      copy.errors.addressFormat.county
    ),
    maxText(
      fieldName('postalOrZipCode', index),
      POSTCODE_MAX_LENGTH,
      copy.errors.addressFormat.postalOrZipCode
    ),
    oneOf(
      fieldName('country', index),
      countries.addressCountries(),
      copy.errors.addressFormat.country
    ),
    maxText(
      fieldName('telephoneNumber', index),
      TELEPHONE_MAX_LENGTH,
      copy.errors.addressFormat.telephoneNumber
    ),
    maxText(
      fieldName('emailAddress', index),
      EMAIL_MAX_LENGTH,
      copy.errors.addressFormat.emailAddress
    )
  )

const identifierValuesFromPayload = (payload, commodity, index) =>
  Object.fromEntries(
    scopedFields(commodity).map((field) => [
      field.id,
      (payload[fieldName(field.id, index)] ?? '').trim()
    ])
  )

const addressValuesFromPayload = (payload, index) =>
  Object.fromEntries(
    ADDRESS_FIELD_ORDER.map((field) => [
      field,
      (payload[fieldName(field, index)] ?? '').trim()
    ])
  )

const blankValuesFor = (commodity) =>
  Object.fromEntries(scopedFields(commodity).map((field) => [field.id, '']))

const blankAddress = () =>
  Object.fromEntries(ADDRESS_FIELD_ORDER.map((field) => [field, '']))

const addressRecordProvided = (values) =>
  ADDRESS_FIELD_ORDER.some((field) => values[field] !== '')

const identifierProvided = (values) =>
  Object.values(values).some((value) => value !== '')

const missingAddressErrors = (values, index) => {
  if (!addressRecordProvided(values)) return {}
  return Object.fromEntries(
    Object.entries(ADDRESS_MANDATORY_MESSAGES)
      .filter(([field]) => values[field] === '')
      .map(([field, message]) => [fieldName(field, index), message])
  )
}

const addressCountryItems = (selected) => [
  { value: '', text: copy.address.countryPlaceholder },
  ...countries.addressCountries().map((name) => ({
    value: name,
    text: name,
    selected: name === selected
  }))
]

const speciesTextOf = (entry) =>
  commodities.speciesLabel(entry.speciesSelection) ??
  entry.speciesSelection ??
  ''

const cardTitleOf = (entry) => {
  const name = (entry.commoditySelection ?? '').trim()
  const code = commodities.commodityCodeFor(name)
  const commodity = code ? `${name} (${code})` : name
  const species = speciesTextOf(entry)
  return species ? `${commodity} — ${species}` : commodity
}

const counterOf = (species, records, cap) =>
  cap === null
    ? copy.counterNoCap(species)
    : copy.counter(species, records + 1, cap)

const maxReachedTextFor = (cap, species, units, overBy, atMax) => {
  if (overBy > 0) return copy.overCount(cap, species, units, overBy)
  if (atMax) return copy.allEntered(cap, species)
  return null
}

const unitEntries = (index, units) =>
  units.map((unit, unitIndex) => ({
    line: index,
    unitIndex,
    label: copy.animalRow(unitIndex + 1),
    summary: animalIdentifierSummary(unit),
    removeAria: copy.removeRowAria(unitIndex + 1)
  }))

const addressFieldsFor = (index, values, errors) => {
  const input = (id, label, extra = {}) => ({
    kind: 'input',
    id: fieldName(id, index),
    label,
    value: values[id] ?? '',
    error: errors[fieldName(id, index)],
    ...extra
  })
  return [
    input('nameOrOrganisationName', copy.address.nameOrOrganisationName, {
      autocomplete: 'name'
    }),
    input('addressLine1', copy.address.addressLine1, {
      autocomplete: 'address-line1'
    }),
    input('addressLine2', copy.address.addressLine2, {
      autocomplete: 'address-line2'
    }),
    input('townOrCity', copy.address.townOrCity, {
      classes: 'govuk-!-width-two-thirds',
      autocomplete: 'address-level2'
    }),
    input('county', copy.address.county, {
      classes: 'govuk-!-width-two-thirds'
    }),
    input('postalOrZipCode', copy.address.postalOrZipCode, {
      classes: 'govuk-input--width-10',
      autocomplete: 'postal-code'
    }),
    {
      kind: 'select',
      id: fieldName('country', index),
      label: copy.address.country,
      items: addressCountryItems(values.country ?? ''),
      error: errors[fieldName('country', index)]
    },
    input('telephoneNumber', copy.address.telephoneNumber, {
      type: 'tel',
      classes: 'govuk-input--width-20',
      autocomplete: 'tel'
    }),
    input('emailAddress', copy.address.emailAddress, {
      type: 'email',
      autocomplete: 'email'
    })
  ]
}

const capacityStateFor = (answers, index, unitCount) => {
  const cap = state.collectionCapAt(answers, [
    'commodityLines',
    index,
    'animalIdentifiers'
  ])
  const atMax = cap !== null && unitCount >= cap
  const overBy = cap !== null ? unitCount - cap : 0
  return { cap, atMax, overBy }
}

const visibleIdentifierFields = (atMax, commodity, index, values, errors) =>
  atMax
    ? []
    : scopedFields(commodity).map((field) => ({
        ...field,
        id: fieldName(field.id, index),
        value: values[field.id] ?? '',
        error: errors[fieldName(field.id, index)]
      }))

const visibleAddressFields = (
  showAddress,
  atMax,
  index,
  addressValues,
  errors
) =>
  showAddress && !atMax ? addressFieldsFor(index, addressValues, errors) : []

const buildCard = (answers, line, form, errors) => {
  const { index, entry } = line
  const commodity = entry.commoditySelection
  const units = entry.animalIdentifiers ?? []
  const { cap, atMax, overBy } = capacityStateFor(answers, index, units.length)
  const species = speciesTextOf(entry)
  const values = form?.values ?? blankValuesFor(commodity)
  const addressValues = form?.addressValues ?? blankAddress()
  const showAddress = permanentAddressApplies(commodity)
  return {
    index,
    anchor: `identification-card-${index}`,
    title: cardTitleOf(entry),
    species,
    counter: atMax ? null : counterOf(species, units.length, cap),
    maxReachedText: maxReachedTextFor(
      cap,
      species,
      units.length,
      overBy,
      atMax
    ),
    atMax,
    units: unitEntries(index, units),
    hasUnits: units.length > 0,
    fields: visibleIdentifierFields(atMax, commodity, index, values, errors),
    showAddress: showAddress && !atMax,
    addressFields: visibleAddressFields(
      showAddress,
      atMax,
      index,
      addressValues,
      errors
    )
  }
}

const summaryOf = (errors, cardErrors) => {
  const errorList = [
    ...Object.entries(errors).map(([field, text]) => ({
      text,
      href: `#${field}`
    })),
    ...cardErrors.map(({ index, text }) => ({
      text,
      href: `#identification-card-${index}`
    }))
  ]
  return errorList.length
    ? { titleText: sharedCopy.errorSummary.title, errorList }
    : null
}

const render = (
  request,
  h,
  journey,
  answers,
  { forms = new Map(), errors = {}, cardErrors = [] } = {}
) => {
  const lines = state.collectionView(answers, ['commodityLines'])
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(),
      journey
    }),
    copy,
    cards: lines.map((line) =>
      buildCard(answers, line, forms.get(line.index), errors)
    ),
    hasLines: lines.length > 0,
    addHref: kit.withChangeContext(request, pagePath('commodities')),
    errors,
    errorSummary: summaryOf(errors, cardErrors)
  })
}

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(request, h, journey, answers)
}

const parseAddAction = (action) =>
  action.startsWith('add:') ? Number(action.slice('add:'.length)) : null

const formHoldsData = (showAddress, values, addressValues) =>
  identifierProvided(values) ||
  (showAddress && addressRecordProvided(addressValues))

const addressErrorsFor = (showAddress, addressValues, index, payload) => {
  if (!showAddress) return {}
  const { errors: addrFormatErrors } = addressRecordProvided(addressValues)
    ? validate(addressChecksFor(index), payload)
    : { errors: null }
  return {
    ...missingAddressErrors(addressValues, index),
    ...(addrFormatErrors ?? {})
  }
}

const buildLineForm = (payload, commodity, index) => {
  const values = identifierValuesFromPayload(payload, commodity, index)
  const addressValues = addressValuesFromPayload(payload, index)
  const showAddress = permanentAddressApplies(commodity)
  const holdsData = formHoldsData(showAddress, values, addressValues)

  const { errors: idErrors } = validate(
    identifierChecksFor(commodity, index),
    payload
  )
  const errors = {
    ...(idErrors ?? {}),
    ...addressErrorsFor(showAddress, addressValues, index, payload)
  }

  return {
    form: { commodity, values, addressValues, showAddress, holdsData },
    errors
  }
}

const buildLineForms = (payload, answers, lines) => {
  const forms = new Map()
  const atMaxByIndex = new Map()
  let errors = {}
  for (const { index, entry } of lines) {
    const commodity = entry.commoditySelection
    const cap = state.collectionCapAt(answers, [
      'commodityLines',
      index,
      'animalIdentifiers'
    ])
    if (cap !== null && (entry.animalIdentifiers ?? []).length >= cap) {
      atMaxByIndex.set(index, cap)
      continue
    }
    const { form, errors: lineErrors } = buildLineForm(
      payload,
      commodity,
      index
    )
    forms.set(index, form)
    errors = { ...errors, ...lineErrors }
  }
  return { forms, atMaxByIndex, errors }
}

// "Save and add another" pressed against a card already at its cap — a
// stale form racing the engine-enforced cardinality link. Surface the
// rejection; never save silently.
const capReachedResponse = (
  request,
  h,
  journey,
  answers,
  forms,
  addIndex,
  atMaxByIndex
) => {
  if (addIndex === null || !atMaxByIndex.has(addIndex)) return null
  return render(request, h, journey, answers, {
    forms,
    cardErrors: [
      {
        index: addIndex,
        text: copy.errors.capReached(atMaxByIndex.get(addIndex))
      }
    ]
  })
}

// "Save and add another" pressed on a card with nothing entered anywhere:
// never append an empty record — name the gap instead.
const withEmptyFormGuard = (errors, forms, addIndex) => {
  const anyData = [...forms.values()].some((form) => form.holdsData)
  if (addIndex === null || anyData || !forms.has(addIndex)) return errors
  const { commodity } = forms.get(addIndex)
  const [first] = scopedFields(commodity)
  return {
    ...errors,
    [fieldName(first.id, addIndex)]: copy.errors.atLeastOneIdentifier
  }
}

const unitFromForm = (form) => {
  const unit = { ...form.values }
  if (form.showAddress && addressRecordProvided(form.addressValues)) {
    unit.permanentAddress = {
      name: form.addressValues.nameOrOrganisationName,
      address: {
        addressLine1: form.addressValues.addressLine1,
        addressLine2: form.addressValues.addressLine2,
        townOrCity: form.addressValues.townOrCity,
        county: form.addressValues.county,
        postalOrZipCode: form.addressValues.postalOrZipCode,
        country: form.addressValues.country,
        telephoneNumber: form.addressValues.telephoneNumber,
        emailAddress: form.addressValues.emailAddress
      }
    }
  }
  return unit
}

const recordCapFailure = async (request, h, index) => {
  const { answers: current } = await state.get(request, h)
  const cap = state.collectionCapAt(current, [
    'commodityLines',
    index,
    'animalIdentifiers'
  ])
  return { index, text: copy.errors.capReached(cap) }
}

const appendLineRecords = async (request, h, forms) => {
  const cardErrors = []
  for (const [index, form] of forms) {
    if (!form.holdsData) continue
    const appended = await state.appendEntryAt(
      request,
      h,
      ['commodityLines', index, 'animalIdentifiers'],
      unitFromForm(form)
    )
    if (appended === null) {
      cardErrors.push(await recordCapFailure(request, h, index))
    }
  }
  return cardErrors
}

const post = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const payload = request.payload ?? {}
  const action = (payload.action ?? '').toString()
  if (isRemoveAction(action)) return postRemove(request, h, action)
  const addIndex = parseAddAction(action)
  const lines = state.collectionView(answers, ['commodityLines'])

  const {
    forms,
    atMaxByIndex,
    errors: formErrors
  } = buildLineForms(payload, answers, lines)

  const capReached = capReachedResponse(
    request,
    h,
    journey,
    answers,
    forms,
    addIndex,
    atMaxByIndex
  )
  if (capReached) return capReached

  const errors = withEmptyFormGuard(formErrors, forms, addIndex)

  if (Object.keys(errors).length > 0) {
    return render(request, h, journey, answers, { forms, errors })
  }

  const cardErrors = await appendLineRecords(request, h, forms)

  if (cardErrors.length > 0) {
    const { answers: current } = await state.get(request, h)
    return render(request, h, journey, current, { cardErrors })
  }

  if (addIndex !== null) {
    return h.redirect(kit.withChangeContext(request, pagePath(page.slug)))
  }
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

const HTTP_STATUS_BAD_REQUEST = 400
const REMOVE_ACTION_PREFIX = 'remove:'

const isRemoveAction = (action) => action.startsWith(REMOVE_ACTION_PREFIX)

const removeTargetOf = (action) => {
  const [line, unit] = action.slice(REMOVE_ACTION_PREFIX.length).split(':')
  return { line: Number(line), unit: Number(unit) }
}

const unitAt = (answers, line, unit) =>
  (answers.commodityLines ?? [])[line]?.animalIdentifiers?.[unit]

// A removal deletes one identifier record, so it submits the card form — the
// crumb travels with it and no GET can trigger it. Line and unit must both
// resolve to a stored record; anything else is refused before any delete runs.
const postRemove = async (request, h, action) => {
  const { answers } = await state.get(request, h)
  const { line, unit } = removeTargetOf(action)
  if (!unitAt(answers, line, unit)) {
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }
  await state.removeEntryAt(
    request,
    h,
    ['commodityLines', line, 'animalIdentifiers'],
    unit
  )
  return h.redirect(kit.withChangeContext(request, pagePath(page.slug)))
}

export const routes = kit.pageRoutes(page, { get, post })
