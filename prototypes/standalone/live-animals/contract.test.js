import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { registry } from './registry.js'
import { store } from './engine/store.js'
import { configureReadyForQuote } from './engine/read.js'
import {
  driveHandler,
  postHandlerOf,
  postHandlerEndingWith
} from './engine/test-support.js'
import { isAnswered } from './lib/answered.js'
import { dispatchPages } from './features/index.js'

import * as origin from './features/origin/controller.js'
import * as commoditiesList from './features/commodities/list.controller.js'
import * as commoditiesSelect from './features/commodities/select.controller.js'
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
import * as portOfEntry from './features/transport/port-of-entry.controller.js'
import * as transportDetails from './features/transport/transport-details.controller.js'
import * as transporters from './features/transport/transporters.controller.js'
import * as transportersSelect from './features/transport/transporters-select.controller.js'
import * as privateTransporterDetails from './features/transport/private-transporter-details.controller.js'
import * as contactSelect from './features/contact/controller.js'
import * as declaration from './features/declaration/controller.js'

/**
 * The obligation ids a real POST handler newly commits must equal its declared
 * `collects`, minus `renderOnly` and `system`. (No `system` obligation remains
 * after inc-028 removed `premium` with the quote feature; the filter is kept
 * generic for when one returns.)
 *
 * Gated obligations must be kept in scope by a `seed` (a pre-existing answer
 * that activates them), else `reconcile` would wipe the fresh write on commit.
 */

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

// Payloads are VALID (an invalid payload re-renders and never commits), and
// every committable id is filled so the declared-but-never-written direction
// is genuinely exercised.
const cases = [
  {
    id: 'origin',
    collects: origin.meta.collects,
    handler: postHandlerOf(origin),
    payload: {
      countryOfOrigin: 'FR',
      // 'yes' keeps regionOfOriginCode in scope on the same commit
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
    // 'internal-market' keeps purposeInInternalMarket in scope on the commit
    seed: { reasonForImport: 'internal-market' },
    payload: { purposeInInternalMarket: 'breeding' }
  },
  {
    id: 'additional-details',
    collects: additionalDetails.meta.collects,
    handler: postHandlerOf(additionalDetails),
    // A triggering commodity line keeps containsUnweanedAnimals in scope on
    // the commit (frame:"anyItem"); without it the fresh write would be wiped.
    seed: { commodityLines: [{ commoditySelection: '0102 - Cattle' }] },
    payload: { animalsCertifiedFor: 'slaughter', containsUnweanedAnimals: 'no' }
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
      // 'Road Vehicle' keeps transitedCountries in scope on the same commit
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
    // 'Commercial transporter' keeps commercialTransporter in scope on the
    // commit; the payload is the vendored option id, the committed answer
    // its copied { name, address, approvalNumber } (c-020).
    seed: { transporterType: 'Commercial transporter' },
    payload: { commercialTransporter: 'channel-livestock-logistics' }
  },
  {
    id: 'private-transporter-details',
    collects: privateTransporterDetails.meta.collects,
    handler: postHandlerOf(privateTransporterDetails),
    // 'Private transporter' keeps privateTransporter in scope on the commit;
    // the keyed-in fields commit as one { name, address } object (the
    // party-record shape, c-020).
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
    // The payload is the vendored option id, the committed answer its
    // copied { name, address } (c-020) — the select side of the
    // unresolved c-001 variant pair.
    payload: { contactAddress: 'animal-and-plant-health-agency' }
  },
  {
    id: 'declaration',
    collects: declaration.meta.collects,
    handler: postHandlerOf(declaration),
    // The POST also attempts state.submitJourney; with no other answers the
    // journey is not ready, so the commit lands and the submit is a no-op —
    // exactly what this contract measures.
    payload: { declaration: 'confirmed' }
  }
]

describe('controller <-> model commit contract', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
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

  // The LIST page declares `collects: ['commodityLines']`, but the
  // identity-minting write is the SELECT sub-page's append (the details
  // sub-page then edits the same entry) — the contract is measured against
  // the handler that actually commits. No seed: the collection is
  // always-live.
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

  // The LIST page declares `collects: ['documents']`, but the identity-minting
  // write is the entry sub-page's append — same shape as commodity lines. No
  // seed: the optional collection is always-live.
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

  // The addresses LANDING accretes one collect per landed spoke, but every
  // write is a SELECT spoke's copy-commit (c-020) — the hub-and-spoke
  // variant of the list/entry split. Each spoke commits exactly its
  // own party, and together the spokes cover everything the landing
  // declares. No seed: the party obligations are always-live.
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
