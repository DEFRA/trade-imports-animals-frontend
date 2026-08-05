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

const ukDate = ({ day, month, year }) => `${day}/${month}/${year}`

/** The address-book id of the first option the page itself offers. Picking from
 * the rendered form keeps the seed off hard-coded reference data. */
const firstOption = (name) => (page) => {
  const value = page.$(`input[name="${name}"]`).first().attr('value')
  if (!value) {
    throw new Error(`No "${name}" option on ${page.heading || 'the page'}`)
  }
  return { [name]: value }
}

export const SEED_STEPS = [
  { slug: 'import-type', fields: { importType: values.importType } },
  {
    slug: 'origin',
    fields: {
      countryOfOrigin: values.countryOfOrigin,
      regionOfOriginCodeRequirement: values.regionOfOriginCodeRequirement,
      regionOfOriginCode: values.regionOfOriginCode,
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
  },
  {
    slug: 'import-reason',
    fields: { reasonForImport: values.reasonForImport }
  },
  {
    slug: 'import-purpose',
    fields: { purposeInInternalMarket: values.purposeInInternalMarket }
  },
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
    fields: { countyParishHoldingCph: values.countyParishHoldingCph }
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
  },
  { slug: 'transporters', fields: { transporterType: values.transporterType } },
  {
    slug: 'transporters/select',
    fields: firstOption('commercialTransporter')
  },
  {
    slug: 'consignment/contact/select',
    fields: firstOption('contactAddress')
  }
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

export const fillNotification = async (client, journeyId) => {
  for (const step of SEED_STEPS) {
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
