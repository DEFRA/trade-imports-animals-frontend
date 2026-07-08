import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { transportersSelectPage } from '../features/transport/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { makeScope } from '../engine/index.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { enumerateScopeStates } from '../analysis/reachability.js'
import { buildDispatch } from './dispatch.js'
import { sections } from './flow.js'
import { readyForCheckYourAnswers } from './section-status.js'
import { pageGatePasses, sectionGatePasses } from './gates.js'

describe('#pageGatePasses / #sectionGatePasses', () => {
  // get-your-quote was the ONLY authored `gate:` this flow ever carried, and it
  // went with the quote feature in inc-028 — so no LIVE section exercises the
  // authored-gate short-circuit any more. The mechanism (gates.js honouring an
  // explicit `gate:`) is kept, so drive it with a synthetic section/page: this
  // proves an authored gate is read WITHOUT the dispatch index, exactly as the
  // quote section used to.
  const syntheticGatedSection = {
    id: 'synthetic',
    gate: (scope) => scope.pass === true,
    pages: []
  }
  const syntheticGatedPage = { id: 'synthetic', gate: (scope) => scope.pass }
  // Every live section now derives its gate from collects; grab one to exercise
  // the pre-build fail-loud path.
  const derivedSection = sections.find((section) => !section.gate)

  // These two run BEFORE the nested suite's beforeAll builds the index —
  // this file's module registry is fresh (vitest isolates per file), so the
  // dispatch index really is unbuilt here.
  it('Should fail loud when a derived gate is consulted before the dispatch index is built', () => {
    const scope = { inScope: new Set() }
    expect(() => sectionGatePasses(derivedSection, scope)).toThrow(
      /buildDispatch/
    )
    expect(() => pageGatePasses(transportersSelectPage, scope)).toThrow(
      /buildDispatch/
    )
  })

  it('Should evaluate an authored gate without needing the dispatch index', () => {
    expect(sectionGatePasses(syntheticGatedSection, { pass: false })).toBe(
      false
    )
    expect(sectionGatePasses(syntheticGatedSection, { pass: true })).toBe(true)
    expect(pageGatePasses(syntheticGatedPage, { pass: false })).toBe(false)
    expect(pageGatePasses(syntheticGatedPage, { pass: true })).toBe(true)
  })

  it('Should author exactly one section gate — the review section (RULE 2 submit-readiness)', () => {
    // The review section is the ONLY authored `gate:`: it gates on
    // submit-readiness, a flow-level fact the collects-derivation cannot express
    // (its own always-in-scope declaration would open it from the start). Every
    // other section stays purely collects-derived — this guards against a second
    // authored gate being smuggled back in.
    const authored = sections.filter((section) => section.gate)
    expect(authored.map((section) => section.id)).toEqual(['review'])
  })

  describe('once the dispatch index is built', () => {
    beforeAll(() => buildDispatch(dispatchPages))

    it('Should pass the derived transporter-select page gate exactly when the commercial transporter is owed, in every scope state', () => {
      // Isolate spoke gating from RULE 1: satisfy the continue prerequisites
      // unconditionally so the assertion pins the in-scope reachability clause.
      const answered = () => true
      for (const answers of enumerateScopeStates()) {
        const { inScope } = reconcile(answers)
        expect(
          pageGatePasses(transportersSelectPage, { inScope, answered })
        ).toBe(inScope.has('commercialTransporter'))
      }
    })

    it('Should derive a page that collects nothing as reachable (the empty-collects convention)', () => {
      // notification-view (the CYA) collects nothing — it is not in
      // dispatchPages, so collectsOf returns [] and the page derives reachable
      // once its prerequisites are met.
      expect(
        pageGatePasses(notificationViewPage, {
          inScope: new Set(),
          answered: () => true
        })
      ).toBe(true)
    })
  })
})

describe('RULE 1 — mandate-derived flow sequencing', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  const sectionById = (id) => sections.find((section) => section.id === id)
  const gatePasses = (id, answers) =>
    sectionGatePasses(sectionById(id), makeScope(answers))

  it('Should always open origin — it owns the first continue obligation, nothing precedes it', () => {
    expect(gatePasses('origin', {})).toBe(true)
  })

  it('Should gate commodities until countryOfOrigin is answered', () => {
    expect(gatePasses('commodities', {})).toBe(false)
    expect(gatePasses('commodities', { countryOfOrigin: 'FR' })).toBe(true)
  })

  it('Should NOT block commodities on its own continue obligation (commoditySelection)', () => {
    // commoditySelection is owned by commodities itself, so it is not a
    // strictly-earlier prerequisite — countryOfOrigin alone opens the section.
    expect(gatePasses('commodities', { countryOfOrigin: 'FR' })).toBe(true)
  })

  it('Should gate every post-commodities section until an item-level commoditySelection is answered', () => {
    const afterCommodities = [
      'consignment',
      'documents',
      'addresses',
      'transport',
      'contact'
    ]
    const originOnly = { countryOfOrigin: 'FR' }
    // A commodity line with a blank commoditySelection does NOT answer it.
    const blankLine = { countryOfOrigin: 'FR', commodityLines: [{}] }
    // Item-level: ANY line filling commoditySelection satisfies the prerequisite.
    const filledLine = {
      countryOfOrigin: 'FR',
      commodityLines: [{}, { commoditySelection: '0102 - Cattle' }]
    }
    for (const id of afterCommodities) {
      expect(gatePasses(id, originOnly)).toBe(false)
      expect(gatePasses(id, blankLine)).toBe(false)
      expect(gatePasses(id, filledLine)).toBe(true)
    }
  })

  it('Should leave an obligation without enforcedAt unaffected by RULE 1 (backwards-compat)', () => {
    // `documents` (optional collection) carries no enforcedAt obligation, so it
    // never itself becomes anyone's prerequisite — the sections after it open on
    // commoditySelection alone, regardless of whether any document exists.
    const noDocuments = {
      countryOfOrigin: 'FR',
      commodityLines: [{ commoditySelection: '0102 - Cattle' }]
    }
    expect(gatePasses('addresses', noDocuments)).toBe(true)
    expect(gatePasses('transport', noDocuments)).toBe(true)
    expect(gatePasses('contact', noDocuments)).toBe(true)
  })
})

describe('RULE 2 — review gates on submit-readiness (no deadlock)', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  const reviewSection = sections.find((section) => section.id === 'review')

  // Every answer section fulfilled/optional — declaration DELIBERATELY absent,
  // to prove the review gate does not wait on the obligation confirmed inside it.
  const allAnswerSectionsReady = {
    countryOfOrigin: 'FR',
    regionOfOriginCodeRequirement: 'no',
    reasonForImport: 'internal-market',
    purposeInInternalMarket: 'breeding',
    animalsCertifiedFor: 'slaughter',
    containsUnweanedAnimals: 'no',
    countyParishHoldingCph: '12/345/6789',
    commodityLines: [
      {
        commoditySelection: '0102 - Cattle',
        typeSelection: 'domestic',
        speciesSelection: ['bos-taurus'],
        numberOfPackages: '5',
        numberOfAnimalsQuantity: '25',
        animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
      }
    ],
    consignor: {
      name: 'Laiterie du Nord SARL',
      address: { addressLine1: '12 Rue de la Gare', country: 'France' }
    },
    placeOfDestination: {
      name: 'Tech Imports Ltd',
      address: { addressLine1: '643 Main Street', country: 'United Kingdom' }
    },
    placeOfOrigin: {
      name: 'Ferme des Trois Vallées',
      address: { addressLine1: '3 Chemin des Prés', country: 'France' }
    },
    consignee: {
      name: 'Yorkshire Dales Livestock Ltd',
      address: {
        addressLine1: 'Unit 4, Auction Mart Lane',
        country: 'United Kingdom'
      }
    },
    importer: {
      name: 'Albion Livestock Imports Ltd',
      address: { addressLine1: '18 Harbour Road', country: 'United Kingdom' }
    },
    portOfEntry: 'ABERDEEN',
    arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
    meansOfTransport: 'Airplane',
    transportIdentification: 'FR-892-LK',
    transportDocumentReference: 'CMR-2026-884721',
    transporterType: 'Commercial transporter',
    commercialTransporter: {
      name: 'Channel Livestock Logistics Ltd',
      address: { addressLine1: '18 Eastern Docks', country: 'United Kingdom' },
      approvalNumber: 'UK/DOVER/T2/00012345'
    },
    contactAddress: {
      name: 'Animal and Plant Health Agency',
      address: { addressLine1: 'Woodham Lane', country: 'United Kingdom' }
    }
  }

  it('Should lock the review section on a blank journey', () => {
    expect(sectionGatePasses(reviewSection, makeScope({}))).toBe(false)
  })

  it('Should open the review section once every answer section is ready — even with the declaration unanswered (no deadlock)', () => {
    expect(
      sectionGatePasses(reviewSection, makeScope(allAnswerSectionsReady))
    ).toBe(true)
  })
})
