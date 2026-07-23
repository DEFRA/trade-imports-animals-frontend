import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { walkObligations, obligationByName } from './flow/obligation-source.js'
import { store } from './engine/store.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { records as recordsStub } from './services/persistence/records/stub.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import {
  driveHandler,
  postHandlerOf,
  postHandlerEndingWith
} from './engine/test-support.js'
import { isAnswered } from './lib/answered.js'
import { dispatchPages } from './features/index.js'

import * as importTypeFilter from './features/import-type-filter/controller.js'
import * as origin from './features/origin/controller.js'
import * as commoditiesSearch from './features/commodities/search.controller.js'
import * as consignmentDetails from './features/commodities/consignment-details.controller.js'
import * as animalIdentification from './features/commodities/animal-identification.controller.js'
import * as importReason from './features/import-reason/controller.js'
import * as importPurpose from './features/import-purpose/controller.js'
import * as additionalDetails from './features/additional-details/controller.js'
import * as documents from './features/documents/controller.js'
import * as addresses from './features/addresses/controller.js'
import * as partyPicker from './features/addresses/party-picker.controller.js'
import * as cphNumber from './features/cph-number/controller.js'
import * as portOfEntry from './features/transport/port-of-entry.controller.js'
import * as transitCountries from './features/transport/transit-countries.controller.js'
import * as transporters from './features/transport/transporters.controller.js'
import * as transportersSelect from './features/transport/transporters-select.controller.js'
import * as privateTransporterDetails from './features/transport/private-transporter-details.controller.js'
import * as contactSelect from './features/contact/controller.js'
import * as declaration from './features/declaration/controller.js'

const drive = driveHandler

const obligationNames = [...walkObligations()].map(
  (node) => node.obligation.name
)

// importType (the filter's service-routing pick) and declaration (the final
// attestation) are flow-collected keys the notification model does not carry as
// obligations — enumerate them alongside the obligation names so the commit
// contract still sees them land.
const committableKeys = [...obligationNames, 'importType', 'declaration']

const committedIds = ({ before, after }) =>
  committableKeys.filter(
    (id) => isAnswered(after[id]) && !isAnswered(before[id])
  )

const committableCollects = (collects) =>
  collects.filter((id) => {
    const obligation = obligationByName(id)
    return !obligation?.renderOnly && !obligation?.system
  })

const cases = [
  {
    id: 'import-type-filter',
    collects: importTypeFilter.meta.collects,
    handler: postHandlerOf(importTypeFilter),
    payload: { importType: 'live-animals' }
  },
  {
    id: 'origin',
    collects: origin.meta.collects,
    handler: postHandlerOf(origin),
    payload: {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'yes',
      regionOfOriginCode: 'FR-75',
      internalReferenceNumber: 'Imports456GB'
    }
  },
  {
    id: 'import-reason',
    collects: importReason.meta.collects,
    handler: postHandlerOf(importReason),
    payload: { reasonForImport: 'internalMarket' }
  },
  {
    id: 'import-purpose',
    collects: importPurpose.meta.collects,
    handler: postHandlerOf(importPurpose),
    seed: { reasonForImport: 'internalMarket' },
    payload: { purposeInInternalMarket: 'breeding' }
  },
  {
    id: 'additional-details',
    collects: additionalDetails.meta.collects,
    handler: postHandlerOf(additionalDetails),
    seed: { commodityLines: [{ commoditySelection: 'Cow' }] },
    payload: { animalsCertifiedFor: 'slaughter', containsUnweanedAnimals: 'no' }
  },
  {
    id: 'cph-number',
    collects: cphNumber.meta.collects,
    handler: postHandlerOf(cphNumber),
    seed: { commodityLines: [{ commoditySelection: 'Cow' }] },
    payload: { countyParishHoldingCph: '12/345/6789' }
  },
  {
    id: 'port-of-entry',
    collects: portOfEntry.meta.collects,
    handler: postHandlerOf(portOfEntry),
    payload: {
      'arrivalDateAtPort-day': '12',
      'arrivalDateAtPort-month': '12',
      'arrivalDateAtPort-year': '2026',
      portOfEntry: 'GB ABD',
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721'
    }
  },
  {
    id: 'transit-countries',
    collects: transitCountries.meta.collects,
    handler: postHandlerOf(transitCountries),
    seed: { meansOfTransport: 'ROAD_VEHICLE' },
    payload: { transitedCountries: ['FR', 'BE'] }
  },
  {
    id: 'transporters',
    collects: transporters.meta.collects,
    handler: postHandlerOf(transporters),
    payload: { transporterType: 'Commercial' }
  },
  {
    id: 'transporters-select',
    collects: transportersSelect.meta.collects,
    handler: postHandlerOf(transportersSelect),
    seed: { transporterType: 'Commercial' },
    payload: { commercialTransporter: 'garcia-livestock-transport' }
  },
  {
    id: 'private-transporter-details',
    collects: privateTransporterDetails.meta.collects,
    handler: postHandlerOf(privateTransporterDetails),
    seed: { transporterType: 'Private' },
    payload: {
      nameOrOrganisationName: 'Jean Dupont',
      addressLine1: '12 Rue des Fermes',
      addressLine2: '',
      townOrCity: 'Amiens',
      county: '',
      postalOrZipCode: '80000',
      country: 'France',
      telephoneNumber: '+33 3 22 55 01 44',
      emailAddress: 'jean.dupont@example.fr'
    }
  },
  {
    id: 'consignment-contact-select',
    collects: contactSelect.meta.collects,
    handler: postHandlerOf(contactSelect),
    payload: { contactAddress: 'animal-and-plant-health-agency' }
  },
  {
    id: 'declaration',
    collects: declaration.meta.collects,
    handler: postHandlerOf(declaration),
    payload: { declaration: 'confirmed' }
  }
]

describe('controller <-> model commit contract', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it.each(cases)(
    'Should commit exactly the committable collects for $id',
    async ({ collects, handler, payload, seed }) => {
      const result = await drive(handler, { payload, seed })
      expect(new Set(committedIds(result))).toEqual(
        new Set(committableCollects(collects))
      )
    }
  )

  it('Should commit commodity lines via the search (batch create) handler it declares', async () => {
    expect(commoditiesSearch.meta.collects).toEqual(['commodityLines'])
    const result = await drive(postHandlerOf(commoditiesSearch), {
      payload: { species: ['Cow|1148346', 'Cat|923501'] }
    })
    expect(new Set(committedIds(result))).toEqual(
      new Set(committableCollects(commoditiesSearch.meta.collects))
    )
    expect(result.after.commodityLines).toEqual([
      {
        commoditySelection: 'Cow',
        speciesSelection: '1148346',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        commoditySelection: 'Cat',
        speciesSelection: '923501',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
  })

  it('Should commit nothing new via the consignment details handler — it edits the lines the search created', async () => {
    expect(consignmentDetails.meta.collects).toEqual([])
    const result = await drive(postHandlerOf(consignmentDetails), {
      seed: {
        commodityLines: [
          { commoditySelection: 'Cow', speciesSelection: '1148346' }
        ]
      },
      payload: { 'numberOfAnimalsQuantity-0': '25', 'numberOfPackages-0': '5' }
    })
    expect(committedIds(result)).toEqual([])
    expect(result.after.commodityLines[0]).toEqual({
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      numberOfAnimalsQuantity: '25',
      numberOfPackages: '5'
    })
  })

  it('Should commit documents via its own add action on the single-page loop', async () => {
    expect(documents.meta.collects).toEqual(['documents'])
    const result = await drive(postHandlerOf(documents), {
      payload: {
        action: 'add',
        accompanyingDocumentType: 'ITAHC',
        accompanyingDocumentReference: 'GBHC1234567890',
        'accompanyingDocumentDateOfIssue-day': '12',
        'accompanyingDocumentDateOfIssue-month': '12',
        'accompanyingDocumentDateOfIssue-year': '2025',
        file: {
          filename: 'itahc-certificate.pdf',
          headers: { 'content-type': 'application/pdf' },
          payload: Buffer.from('pdf-bytes')
        }
      }
    })
    expect(new Set(committedIds(result))).toEqual(
      new Set(committableCollects(documents.meta.collects))
    )
  })

  it('Should append an animal identifier unit at depth-2 via the identification surface, writing only the commodity-gated fields', async () => {
    expect(animalIdentification.meta.collects).toEqual([])
    const post = postHandlerEndingWith(
      animalIdentification,
      'commodities/identification'
    )
    const result = await drive(post, {
      seed: { commodityLines: [{ commoditySelection: 'Cat' }] },
      payload: {
        action: 'add:0',
        'animalIdentifierPassport-0': 'UK123456789',
        'animalIdentifierEarTag-0': 'UK999',
        'nameOrOrganisationName-0': 'Pet Owner',
        'addressLine1-0': '1 Farm Lane',
        'townOrCity-0': 'Skipton',
        'postalOrZipCode-0': 'BD23 1UD',
        'country-0': 'United Kingdom',
        'telephoneNumber-0': '+44 1756 555 0192',
        'emailAddress-0': 'owner@example.co.uk'
      }
    })
    const unit = result.after.commodityLines[0].animalIdentifiers[0]
    expect(unit.animalIdentifierPassport).toBe('UK123456789')
    expect('animalIdentifierEarTag' in unit).toBe(false)
    expect(unit.permanentAddress.name).toBe('Pet Owner')
  })

  it('Should commit each party via its select (copy) spoke, covering the landing collects', async () => {
    expect(addresses.meta.collects).toEqual([
      'consignor',
      'placeOfDestination',
      'placeOfOrigin',
      'consignee',
      'importer'
    ])

    // One shared picker serves all five spokes: the chosen address
    // travels as the book's stable id, whichever page of results it sat on.
    const spokes = [
      {
        slug: 'consignors/select',
        id: 'laiterie-du-nord',
        commits: 'consignor'
      },
      {
        slug: 'destinations/select',
        id: 'tech-imports',
        commits: 'placeOfDestination'
      },
      {
        slug: 'place-of-origin/select',
        id: 'origin-farm',
        commits: 'placeOfOrigin'
      },
      {
        slug: 'consignees/select',
        id: 'british-livestock',
        commits: 'consignee'
      },
      { slug: 'importers/select', id: 'import-co-uk', commits: 'importer' }
    ]
    const committed = []
    for (const { slug, id, commits } of spokes) {
      const result = await drive(postHandlerEndingWith(partyPicker, slug), {
        payload: { action: 'save', party: id }
      })
      expect(committedIds(result)).toEqual([commits])
      committed.push(...committedIds(result))
    }
    expect(new Set(committed)).toEqual(
      new Set(committableCollects(addresses.meta.collects))
    )
  })
})
