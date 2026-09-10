import { readFileSync } from 'node:fs'

import { lineKey } from '../../src/server/app/sets/live-animals/journeys/linear/features/commodities/search/selection/line-key.js'

const HTTP_FOUND = 302
const HTTP_OK = 200

export const { values } = JSON.parse(
  readFileSync(
    new URL(
      '../../src/server/app/sets/live-animals/journeys/linear/flow/fixtures/happy-path.json',
      import.meta.url
    ),
    'utf8'
  )
)

const [firstLine] = values.commodityLines
const [firstUnit] = firstLine.animalIdentifiers
const arrival = values.arrivalDateAtPort
const { privateTransporter } = values

const ukDate = ({ day, month, year }) => `${day}/${month}/${year}`

// The origin page fills the country in as a fixed prefix and asks only for the
// part after it, so the fixture's whole code is split the same way here.
const REGION_CODE_SEPARATOR = '-'
const regionCodeSuffix = values.regionOfOriginCode.slice(
  values.countryOfOrigin.length + REGION_CODE_SEPARATOR.length
)

// The CPH page asks for the number in three boxes — two digits of county, three
// of parish and four of holding — so the fixture's whole number is split the
// same way here. The fixture carries the slashed form, so the split reads
// digits only.
const CPH_PARTS = [
  ['cphCounty', 2],
  ['cphParish', 3],
  ['cphHolding', 4]
]

const splitCph = (whole) => {
  const digits = String(whole ?? '').replace(/\D/g, '')
  const { fields } = CPH_PARTS.reduce(
    ({ fields, taken }, [part, count]) => ({
      fields: { ...fields, [part]: digits.slice(taken, taken + count) },
      taken: taken + count
    }),
    { fields: {}, taken: 0 }
  )
  return fields
}

const cphFields = splitCph(values.countyParishHoldingCph)

/** The address-book id of the first option the page itself offers. Picking from
 * the rendered form keeps the seed off hard-coded reference data. */
const firstOption = (name) => (page) => {
  const value = page.$(`input[name="${name}"]`).first().attr('value')
  if (!value) {
    throw new Error(`No "${name}" option on ${page.heading || 'the page'}`)
  }
  return { [name]: value }
}

/** The same idea for a dropdown, skipping the placeholder and the divider. */
const firstListedOption = (name) => (page) => {
  const value = page
    .$(`select[name="${name}"] option[value]:not([value=""])`)
    .first()
    .attr('value')
  if (!value) {
    throw new Error(`No "${name}" option on ${page.heading || 'the page'}`)
  }
  return { [name]: value }
}

const BEFORE_REASON = [
  {
    slug: 'origin',
    fields: {
      countryOfOrigin: values.countryOfOrigin,
      regionOfOriginCodeRequirement: values.regionOfOriginCodeRequirement,
      regionOfOriginCodeSuffix: regionCodeSuffix,
      internalReferenceNumber: values.internalReferenceNumber
    }
  },
  {
    slug: 'commodities',
    fields: { species: values.commodityLines.map(lineKey) }
  },
  {
    slug: 'consignment-details',
    fields: {
      'numberOfAnimalsQuantity-0': firstLine.numberOfAnimalsQuantity,
      'numberOfPackages-0': firstLine.numberOfPackages
    }
  }
]

const AFTER_REASON = [
  {
    slug: 'commodities/identification',
    fields: {
      'animalIdentifierEarTag-0': firstUnit.animalIdentifierEarTag,
      action: 'finish'
    }
  },
  {
    slug: 'additional-details',
    fields: {
      animalsCertifiedFor: values.animalsCertifiedFor,
      containsUnweanedAnimals: values.containsUnweanedAnimals
    }
  },
  { slug: 'place-of-origin/select', fields: firstOption('party') },
  { slug: 'consignors/select', fields: firstOption('party') },
  { slug: 'consignees/select', fields: firstOption('party') },
  { slug: 'importers/select', fields: firstOption('party') },
  { slug: 'destinations/select', fields: firstOption('party') },
  { slug: 'addresses', fields: {} },
  {
    slug: 'cph-number',
    fields: cphFields
  },
  {
    slug: 'port-of-entry',
    fields: {
      arrivalDateAtPort: ukDate(arrival),
      portOfEntry: values.portOfEntry,
      meansOfTransport: values.meansOfTransport,
      transportIdentification: values.transportIdentification,
      transportDocumentReference: values.transportDocumentReference
    }
  },
  {
    slug: 'transit-countries',
    fields: { transitedCountries: values.transitedCountries }
  }
]

const CONTACT_STEP = {
  slug: 'consignment/contact/select',
  fields: firstOption('contactAddress')
}

/** The follow-up answers each reason for import reveals on the reason page
 * itself, keyed by the branch's own input name. A reason whose reveal is not
 * opened submits nothing extra. */
const REASON_REVEAL_FIELDS = new Map([
  [
    'internalMarket',
    () => ({ purposeInInternalMarket: values.purposeInInternalMarket })
  ],
  [
    'transit',
    (page) => ({
      ...firstListedOption('transitPortOfExit')(page),
      ...firstListedOption('transitDestinationCountry')(page)
    })
  ]
])

const TRANSPORTER_STEPS = new Map([
  [
    'Commercial',
    [
      {
        slug: 'transporters/select',
        fields: firstOption('commercialTransporter')
      }
    ]
  ],
  [
    'Private',
    [
      {
        slug: 'transporters/add/private',
        fields: {
          nameOrOrganisationName: privateTransporter.name,
          addressLine1: privateTransporter.address.addressLine1,
          addressLine2: privateTransporter.address.addressLine2,
          townOrCity: privateTransporter.address.townOrCity,
          county: privateTransporter.address.county,
          postalOrZipCode: privateTransporter.address.postalOrZipCode,
          country: privateTransporter.address.country,
          telephoneNumber: privateTransporter.address.telephoneNumber,
          emailAddress: privateTransporter.address.emailAddress
        }
      }
    ]
  ]
])

/** The notification shapes the audit needs, keyed by the name the URL list
 * refers to them by. Every conditional page is answered on one of them. */
export const SEED_SHAPES = {
  draft: {
    reasonForImport: values.reasonForImport,
    transporterType: values.transporterType
  },
  submitted: {
    reasonForImport: values.reasonForImport,
    transporterType: values.transporterType,
    submit: true
  },
  transit: { reasonForImport: 'transit', transporterType: 'Private' }
}

const branchFor = (branches, key, label) => {
  const branch = branches.get(key)
  if (!branch) {
    throw new Error(`The seed has nothing for ${label} "${key}"`)
  }
  return branch
}

const reasonStep = (reasonForImport) => ({
  slug: 'import-reason',
  fields: (page) => ({
    reasonForImport,
    ...branchFor(
      REASON_REVEAL_FIELDS,
      reasonForImport,
      'reason for import'
    )(page)
  })
})

export const seedSteps = ({ reasonForImport, transporterType }) => [
  ...BEFORE_REASON,
  reasonStep(reasonForImport),
  ...AFTER_REASON,
  { slug: 'transporters/add', fields: { transporterType } },
  ...branchFor(TRANSPORTER_STEPS, transporterType, 'transporter type'),
  CONTACT_STEP
]

const fieldsFor = (step, page) =>
  typeof step.fields === 'function' ? step.fields(page) : step.fields

export const createNotification = async (client) => {
  const dashboard = await client.document('/')
  const created = await client.submit('/notifications', {}, dashboard.crumb)
  const journeyId = created.location?.split('/')[2]
  if (created.status !== HTTP_FOUND || !journeyId) {
    throw new Error(
      `Could not create a notification (status ${created.status}, location ${created.location})`
    )
  }
  return journeyId
}

export const fillNotification = async (client, journeyId, shape) => {
  for (const step of seedSteps(shape)) {
    const path = `/notifications/${journeyId}/${step.slug}`
    const page = await client.document(path)
    if (page.status !== HTTP_OK) {
      throw new Error(`Seed step ${step.slug} did not render (${page.status})`)
    }
    const posted = await client.submit(path, fieldsFor(step, page), page.crumb)
    if (posted.status !== HTTP_FOUND) {
      throw new Error(
        `Seed step ${step.slug} was rejected (${posted.status}) — the page's ` +
          'fields have moved on from what this seed sends'
      )
    }
  }
}

export const submitNotification = async (client, journeyId) => {
  const path = `/notifications/${journeyId}/declaration`
  const page = await client.document(path)
  const posted = await client.submit(
    path,
    { declaration: values.declaration },
    page.crumb
  )
  const confirmation = `/notifications/${journeyId}/confirmation`
  if (posted.location !== confirmation) {
    throw new Error(
      `Declaration did not submit the notification (went to ${posted.location}, ` +
        `expected ${confirmation})`
    )
  }
}
