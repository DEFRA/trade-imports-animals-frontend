import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { registry } from './registry.js'
import { store } from './engine/store.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import {
  driveHandler,
  postHandlerOf,
  postHandlerEndingWith
} from './engine/test-support.js'
import { isAnswered } from './lib/answered.js'
import { satisfied } from './engine/evaluate/complete.js'
import { dispatchPages } from './features/index.js'

import * as origin from './features/origin/controller.js'
import * as commoditiesList from './features/commodities/list.controller.js'
import * as commoditiesSelect from './features/commodities/select.controller.js'
import * as animalIdentifiersEntry from './features/commodities/animal-identifiers.entry.controller.js'
import * as importReason from './features/import-reason/controller.js'
import * as importPurpose from './features/import-purpose/controller.js'
import * as additionalDetails from './features/additional-details/controller.js'
import * as documentsList from './features/documents/list.controller.js'
import * as documentsEntry from './features/documents/entry.controller.js'
import * as addresses from './features/addresses/controller.js'
import * as consignorsSelect from './features/addresses/consignors-select.controller.js'
import * as destinationsSelect from './features/addresses/destinations-select.controller.js'
import * as placeOfOriginSelect from './features/addresses/place-of-origin-select.controller.js'
import * as consigneesSelect from './features/addresses/consignees-select.controller.js'
import * as importersSelect from './features/addresses/importers-select.controller.js'
import * as cphNumber from './features/cph-number/controller.js'
import * as portOfEntry from './features/transport/port-of-entry.controller.js'
import * as transportDetails from './features/transport/transport-details.controller.js'
import * as transporters from './features/transport/transporters.controller.js'
import * as transportersSelect from './features/transport/transporters-select.controller.js'
import * as privateTransporterDetails from './features/transport/private-transporter-details.controller.js'
import * as contactSelect from './features/contact/controller.js'
import * as declaration from './features/declaration/controller.js'

const drive = driveHandler

const committedIds = ({ before, after }) =>
  registry.all
    .map((obligation) => obligation.id)
    .filter((id) => isAnswered(after[id]) && !isAnswered(before[id]))

const committableCollects = (collects) =>
  collects.filter((id) => {
    const obligation = registry.byId(id)
    return !obligation.renderOnly && !obligation.system
  })

const cases = [
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
    payload: { reasonForImport: 'internal-market' }
  },
  {
    id: 'import-purpose',
    collects: importPurpose.meta.collects,
    handler: postHandlerOf(importPurpose),
    seed: { reasonForImport: 'internal-market' },
    payload: { purposeInInternalMarket: 'breeding' }
  },
  {
    id: 'additional-details',
    collects: additionalDetails.meta.collects,
    handler: postHandlerOf(additionalDetails),
    seed: { commodityLines: [{ commoditySelection: '0102 - Cattle' }] },
    payload: { animalsCertifiedFor: 'slaughter', containsUnweanedAnimals: 'no' }
  },
  {
    id: 'cph-number',
    collects: cphNumber.meta.collects,
    handler: postHandlerOf(cphNumber),
    seed: { commodityLines: [{ commoditySelection: '0102 - Cattle' }] },
    payload: { countyParishHoldingCph: '12/345/6789' }
  },
  {
    id: 'port-of-entry',
    collects: portOfEntry.meta.collects,
    handler: postHandlerOf(portOfEntry),
    payload: {
      portOfEntry: 'ABERDEEN',
      'arrivalDateAtPort-day': '12',
      'arrivalDateAtPort-month': '12',
      'arrivalDateAtPort-year': '2026'
    }
  },
  {
    id: 'transport-details',
    collects: transportDetails.meta.collects,
    handler: postHandlerOf(transportDetails),
    payload: {
      meansOfTransport: 'Road Vehicle',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721',
      transitedCountries: ['FR', 'BE']
    }
  },
  {
    id: 'transporters',
    collects: transporters.meta.collects,
    handler: postHandlerOf(transporters),
    payload: { transporterType: 'Commercial transporter' }
  },
  {
    id: 'transporters-select',
    collects: transportersSelect.meta.collects,
    handler: postHandlerOf(transportersSelect),
    seed: { transporterType: 'Commercial transporter' },
    payload: { commercialTransporter: 'channel-livestock-logistics' }
  },
  {
    id: 'private-transporter-details',
    collects: privateTransporterDetails.meta.collects,
    handler: postHandlerOf(privateTransporterDetails),
    seed: { transporterType: 'Private transporter' },
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
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it.each(cases)(
    'Should commit exactly the committable collects for $id',
    ({ collects, handler, payload, seed }) => {
      const result = drive(handler, { payload, seed })
      expect(new Set(committedIds(result))).toEqual(
        new Set(committableCollects(collects))
      )
    }
  )

  it('Should commit commodity lines via the select (append) handler it declares', () => {
    expect(commoditiesList.meta.collects).toEqual(['commodityLines'])
    const postAdd = postHandlerEndingWith(
      commoditiesSelect,
      'commodities/select'
    )
    const result = drive(postAdd, {
      payload: {
        commoditySelection: '0102 - Cattle',
        typeSelection: 'domestic',
        speciesSelection: ['bos-taurus']
      }
    })
    expect(new Set(committedIds(result))).toEqual(
      new Set(committableCollects(commoditiesList.meta.collects))
    )
  })

  it('Should commit documents via the entry (append) handler it declares', () => {
    expect(documentsList.meta.collects).toEqual(['documents'])
    const postAdd = postHandlerEndingWith(
      documentsEntry,
      'accompanying-documents/add'
    )
    const result = drive(postAdd, {
      payload: {
        accompanyingDocumentType: 'ITAHC',
        accompanyingDocumentAttachmentType: 'PDF',
        accompanyingDocumentReference: 'GBHC1234567890',
        'accompanyingDocumentDateOfIssue-day': '12',
        'accompanyingDocumentDateOfIssue-month': '12',
        'accompanyingDocumentDateOfIssue-year': '2025'
      }
    })
    expect(new Set(committedIds(result))).toEqual(
      new Set(committableCollects(documentsList.meta.collects))
    )
  })

  it('Should append an animal identifier unit at depth-2, writing only the commodity-gated fields', () => {
    const postAdd = postHandlerEndingWith(
      animalIdentifiersEntry,
      'identifiers/add'
    )
    const result = drive(postAdd, {
      seed: { commodityLines: [{ commoditySelection: '01061900 - Cats' }] },
      params: { index: '0' },
      payload: {
        animalIdentifierPassport: 'UK123456789',
        animalIdentifierEarTag: 'UK999',
        nameOrOrganisationName: 'Pet Owner',
        addressLine1: '1 Farm Lane',
        townOrCity: 'Skipton',
        postalOrZipCode: 'BD23 1UD',
        country: 'United Kingdom',
        telephoneNumber: '+44 1756 555 0192',
        emailAddress: 'owner@example.co.uk'
      }
    })
    const unit = result.after.commodityLines[0].animalIdentifiers[0]
    expect(unit.animalIdentifierPassport).toBe('UK123456789')
    expect('animalIdentifierEarTag' in unit).toBe(false)
    expect(unit.permanentAddress.name).toBe('Pet Owner')

    result.after.commodityLines[0] = {
      ...result.after.commodityLines[0],
      typeSelection: 'domestic',
      speciesSelection: ['bos-taurus'],
      numberOfAnimalsQuantity: '2'
    }
    expect(satisfied('commodityLines', result.after)).toBe(true)
  })

  it('Should commit each party via its select (copy) spoke, covering the landing collects', () => {
    expect(addresses.meta.collects).toEqual([
      'consignor',
      'placeOfDestination',
      'placeOfOrigin',
      'consignee',
      'importer'
    ])

    const spokes = [
      {
        module: consignorsSelect,
        slug: 'consignors/select',
        payload: { consignor: 'laiterie-du-nord' },
        commits: ['consignor']
      },
      {
        module: destinationsSelect,
        slug: 'destinations/select',
        payload: { placeOfDestination: 'tech-imports-ltd' },
        commits: ['placeOfDestination']
      },
      {
        module: placeOfOriginSelect,
        slug: 'place-of-origin/select',
        payload: { placeOfOrigin: 'ferme-des-trois-vallees' },
        commits: ['placeOfOrigin']
      },
      {
        module: consigneesSelect,
        slug: 'consignees/select',
        payload: { consignee: 'yorkshire-dales-livestock' },
        commits: ['consignee']
      },
      {
        module: importersSelect,
        slug: 'importers/select',
        payload: { importer: 'albion-livestock-imports' },
        commits: ['importer']
      }
    ]
    const committed = []
    for (const { module, slug, payload, commits } of spokes) {
      const result = drive(postHandlerEndingWith(module, slug), { payload })
      expect(committedIds(result)).toEqual(commits)
      committed.push(...committedIds(result))
    }
    expect(new Set(committed)).toEqual(
      new Set(committableCollects(addresses.meta.collects))
    )
  })
})
