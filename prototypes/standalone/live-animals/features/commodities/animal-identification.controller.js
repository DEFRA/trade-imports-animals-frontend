import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { includesUnion } from '../../engine/evaluate/predicate.js'
import { isModelB } from '../../engine/model-flag.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as countries from '../../services/countries/index.js'
import * as commodities from '../../services/commodities/index.js'
import { animalIdentificationPage as page } from './page.js'
import {
  animalIdentifierPassport,
  animalIdentifierTattoo,
  animalIdentifierEarTag,
  animalIdentifierIdentificationDetails,
  animalIdentifierDescription,
  horseName,
  permanentAddress
} from './obligations.js'
import { obligations as modelObligations } from '../../model/obligations/obligations.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/animal-identification`

export const IDENTIFIER_LABELS = {
  animalIdentifierPassport: 'Passport',
  animalIdentifierTattoo: 'Tattoo',
  animalIdentifierEarTag: 'Ear tag',
  horseName: 'Horse name',
  animalIdentifierIdentificationDetails: 'Identification details',
  animalIdentifierDescription: 'Description'
}

export const animalIdentifierSummary = (unit) => {
  const parts = Object.entries(IDENTIFIER_LABELS)
    .filter(([id]) => (unit[id] ?? '').toString().trim() !== '')
    .map(([id, label]) => `${label}: ${unit[id]}`)
  if (unit.permanentAddress?.name) {
    parts.push(`Permanent address: ${unit.permanentAddress.name}`)
  }
  return parts.length ? parts.join(', ') : 'No identifier provided'
}

const modelObligationByName = new Map(
  modelObligations.map((obligation) => [obligation.name, obligation])
)

const metadataWhitelistFor = (obligation) =>
  modelObligationByName.get(obligation.id)?.applyTo?.metadata?.values ?? []

const metadataAllowListApplies = (obligation, commodity) =>
  metadataWhitelistFor(obligation).includes(
    commodities.commodityCodeFor(commodity)
  )

const metadataFallbackApplies = (obligation, commodity) =>
  !metadataWhitelistFor(obligation).includes(
    commodities.commodityCodeFor(commodity)
  )

const typeApplies = (obligation, commodity) =>
  isModelB()
    ? metadataAllowListApplies(obligation, commodity)
    : obligation.activatedBy.includes.includes(commodity)

const TYPE_FIELDS = [
  {
    obligation: animalIdentifierPassport,
    id: 'animalIdentifierPassport',
    label: 'Passport number',
    hint: 'For example, UK123456789'
  },
  {
    obligation: animalIdentifierTattoo,
    id: 'animalIdentifierTattoo',
    label: 'Tattoo',
    hint: 'For example, AB1234'
  },
  {
    obligation: animalIdentifierEarTag,
    id: 'animalIdentifierEarTag',
    label: 'Ear tag number',
    hint: 'For example, UK123456789012'
  },
  { obligation: horseName, id: 'horseName', label: 'Horse name' }
]

const fallbackApplies = (obligation, commodity) =>
  isModelB()
    ? metadataFallbackApplies(obligation, commodity)
    : !includesUnion(obligation.activatedBy.notInUnionOf).includes(commodity)

const FALLBACK_FIELDS = [
  {
    obligation: animalIdentifierIdentificationDetails,
    id: 'animalIdentifierIdentificationDetails',
    label: 'Identification details',
    hint: 'Any other way this animal is identified, if it has no passport, tattoo or ear tag'
  },
  {
    obligation: animalIdentifierDescription,
    id: 'animalIdentifierDescription',
    label: 'Animal description'
  }
]

const IDENTIFIER_MAX_MESSAGES = {
  animalIdentifierPassport: 'Passport must be 58 characters or fewer',
  animalIdentifierTattoo: 'Tattoo must be 58 characters or fewer',
  animalIdentifierEarTag: 'Ear tag must be 58 characters or fewer',
  horseName: 'Horse name must be 58 characters or fewer',
  animalIdentifierIdentificationDetails:
    'Identification details must be 58 characters or fewer',
  animalIdentifierDescription: 'Description must be 58 characters or fewer'
}

const ADDRESS_MANDATORY_MESSAGES = {
  nameOrOrganisationName: 'Enter a name or organisation name',
  addressLine1: 'Enter address line 1',
  townOrCity: 'Enter a town or city',
  postalOrZipCode: 'Enter a postal or zip code',
  country: 'Select a country',
  telephoneNumber: 'Enter a telephone number',
  emailAddress: 'Enter an email address'
}

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

const fieldName = (id, index) => `${id}-${index}`

const scopedTypeFields = (commodity) =>
  TYPE_FIELDS.filter((field) => typeApplies(field.obligation, commodity))

const scopedFallbackFields = (commodity) =>
  FALLBACK_FIELDS.filter((field) =>
    fallbackApplies(field.obligation, commodity)
  )

const scopedFields = (commodity) => [
  ...scopedTypeFields(commodity),
  ...scopedFallbackFields(commodity)
]

const permanentAddressApplies = (commodity) =>
  isModelB()
    ? metadataAllowListApplies(permanentAddress, commodity)
    : permanentAddress.activatedBy.includes.includes(commodity)

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
      255,
      'Name or organisation name must be 255 characters or less'
    ),
    maxText(
      fieldName('addressLine1', index),
      255,
      'Address line 1 must be 255 characters or less'
    ),
    maxText(
      fieldName('addressLine2', index),
      255,
      'Address line 2 must be 255 characters or less'
    ),
    maxText(
      fieldName('townOrCity', index),
      100,
      'Town or city must be 100 characters or less'
    ),
    maxText(
      fieldName('county', index),
      100,
      'County must be 100 characters or less'
    ),
    maxText(
      fieldName('postalOrZipCode', index),
      12,
      'Postal or zip code must be 12 characters or less'
    ),
    oneOf(
      fieldName('country', index),
      countries.addressCountries(),
      'Select a country from the list'
    ),
    maxText(
      fieldName('telephoneNumber', index),
      20,
      'Telephone number must be 20 characters or less'
    ),
    maxText(
      fieldName('emailAddress', index),
      254,
      'Email address must be 254 characters or less'
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
  { value: '', text: 'Select a country' },
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
    ? `Enter details for ${species}`
    : `Enter details for ${species} ${records + 1} of ${cap}`

const unitRows = (request, index, units) =>
  units.map((unit, unitIndex) => ({
    key: { text: `Animal ${unitIndex + 1}` },
    value: { text: animalIdentifierSummary(unit) },
    actions: {
      items: [
        {
          href: kit.withChangeContext(
            request,
            pagePath(`${page.slug}/${index}/${unitIndex}/remove`)
          ),
          text: 'Remove',
          visuallyHiddenText: `animal ${unitIndex + 1}`
        }
      ]
    }
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
    input('nameOrOrganisationName', 'Name or organisation name', {
      autocomplete: 'name'
    }),
    input('addressLine1', 'Address line 1', {
      autocomplete: 'address-line1'
    }),
    input('addressLine2', 'Address line 2 (optional)', {
      autocomplete: 'address-line2'
    }),
    input('townOrCity', 'Town or city', {
      classes: 'govuk-!-width-two-thirds',
      autocomplete: 'address-level2'
    }),
    input('county', 'County (optional)', {
      classes: 'govuk-!-width-two-thirds'
    }),
    input('postalOrZipCode', 'Postal or zip code', {
      classes: 'govuk-input--width-10',
      autocomplete: 'postal-code'
    }),
    {
      kind: 'select',
      id: fieldName('country', index),
      label: 'Country',
      items: addressCountryItems(values.country ?? ''),
      error: errors[fieldName('country', index)]
    },
    input('telephoneNumber', 'Telephone number', {
      type: 'tel',
      classes: 'govuk-input--width-20',
      autocomplete: 'tel'
    }),
    input('emailAddress', 'Email address', {
      type: 'email',
      autocomplete: 'email'
    })
  ]
}

const buildCard = (request, answers, line, form, errors) => {
  const { index, entry } = line
  const commodity = entry.commoditySelection
  const units = entry.animalIdentifiers ?? []
  const cap = state.collectionCapAt(answers, [
    'commodityLines',
    index,
    'animalIdentifiers'
  ])
  const atMax = cap !== null && units.length >= cap
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
    maxReachedText: atMax
      ? `You have entered details for all ${cap} ${species} animals. Remove a record if you need to replace it.`
      : null,
    atMax,
    rows: unitRows(request, index, units),
    hasUnits: units.length > 0,
    fields: atMax
      ? []
      : scopedFields(commodity).map((field) => ({
          ...field,
          id: fieldName(field.id, index),
          value: values[field.id] ?? '',
          error: errors[fieldName(field.id, index)]
        })),
    showAddress: showAddress && !atMax,
    addressFields:
      showAddress && !atMax
        ? addressFieldsFor(index, addressValues, errors)
        : []
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
    ? { titleText: 'There is a problem', errorList }
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
    ...kit.base('Animal identification details', {
      backLink: hubPath(),
      journey
    }),
    heading: 'Animal identification details',
    cards: lines.map((line) =>
      buildCard(request, answers, line, forms.get(line.index), errors)
    ),
    hasLines: lines.length > 0,
    emptyText: 'You have not added any commodities yet.',
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

const post = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const payload = request.payload ?? {}
  const action = (payload.action ?? '').toString()
  const addIndex = parseAddAction(action)
  const lines = state.collectionView(answers, ['commodityLines'])

  const forms = new Map()
  const atMaxByIndex = new Map()
  const errors = {}
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
    const values = identifierValuesFromPayload(payload, commodity, index)
    const addressValues = addressValuesFromPayload(payload, index)
    const showAddress = permanentAddressApplies(commodity)
    const holdsData =
      identifierProvided(values) ||
      (showAddress && addressRecordProvided(addressValues))
    forms.set(index, {
      commodity,
      values,
      addressValues,
      showAddress,
      holdsData
    })

    const { errors: idErrors } = validate(
      identifierChecksFor(commodity, index),
      payload
    )
    const { errors: addrFormatErrors } =
      showAddress && addressRecordProvided(addressValues)
        ? validate(addressChecksFor(index), payload)
        : { errors: null }
    Object.assign(
      errors,
      idErrors ?? {},
      showAddress ? missingAddressErrors(addressValues, index) : {},
      addrFormatErrors ?? {}
    )
  }

  // "Save and add another" pressed against a card already at its cap — a
  // stale form racing the engine-enforced cardinality link. Surface the
  // rejection; never save silently.
  if (addIndex !== null && atMaxByIndex.has(addIndex)) {
    return render(request, h, journey, answers, {
      forms,
      cardErrors: [
        {
          index: addIndex,
          text: `You have already entered details for all ${atMaxByIndex.get(addIndex)} animals — remove a record before adding another`
        }
      ]
    })
  }

  // "Save and add another" pressed on a card with nothing entered anywhere:
  // never append an empty record — name the gap instead.
  const anyData = [...forms.values()].some((form) => form.holdsData)
  if (addIndex !== null && !anyData && forms.has(addIndex)) {
    const { commodity } = forms.get(addIndex)
    const [first] = scopedFields(commodity)
    errors[fieldName(first.id, addIndex)] =
      'Enter at least one identifier for this animal'
  }

  if (Object.keys(errors).length > 0) {
    return render(request, h, journey, answers, { forms, errors })
  }

  const cardErrors = []
  for (const [index, form] of forms) {
    if (!form.holdsData) continue
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
    const appended = await state.appendEntryAt(
      request,
      h,
      ['commodityLines', index, 'animalIdentifiers'],
      unit
    )
    if (appended === null) {
      const { answers: current } = await state.get(request, h)
      const cap = state.collectionCapAt(current, [
        'commodityLines',
        index,
        'animalIdentifiers'
      ])
      cardErrors.push({
        index,
        text: `You have already entered details for all ${cap} animals — remove a record before adding another`
      })
    }
  }

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

const getRemove = async (request, h) => {
  const { answers } = await state.get(request, h)
  const index = Number(request.params.line)
  const lines = answers.commodityLines ?? []
  if (Number.isInteger(index) && index >= 0 && index < lines.length) {
    await state.removeEntryAt(
      request,
      h,
      ['commodityLines', index, 'animalIdentifiers'],
      Number(request.params.unit)
    )
  }
  return h.redirect(kit.withChangeContext(request, pagePath(page.slug)))
}

export const routes = [
  ...kit.pageRoutes(page, { get, post }),
  {
    method: 'GET',
    path: pagePath(`${page.slug}/{line}/{unit}/remove`),
    options: open,
    handler: getRemove
  }
]
