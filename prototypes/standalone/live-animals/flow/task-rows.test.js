import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { makeScope } from '../engine/index.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../engine/status.js'
import { buildDispatch } from './dispatch.js'
import { answerSections, sections } from './flow.js'
import { readyForCheckYourAnswers, sectionStatus } from './section-status.js'
import { rowEntry, rowGatePasses } from './navigation.js'
import { sectionGatePasses } from './gates.js'
import { rowStatus, taskRowById, taskRows } from './task-rows.js'

const { values: happyPath } = JSON.parse(
  readFileSync(new URL('../spec/fixtures/happy-path.json', import.meta.url))
)

const statusIn = (rowId, answers) =>
  rowStatus(taskRowById(rowId), answers, reconcile(answers).inScope)

const unlocked = {
  countryOfOrigin: 'FR',
  commodityLines: [{ commoditySelection: 'Cat' }]
}

beforeAll(() => {
  buildDispatch(dispatchPages)
  configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
})

describe('#rowStatus — one status per hub task row', () => {
  it('Should walk the origin row through Not yet started, In progress and Completed', () => {
    expect(statusIn('origin', {})).toBe(NOT_STARTED)
    expect(statusIn('origin', { internalReferenceNumber: 'Ref1' })).toBe(
      IN_PROGRESS
    )
    expect(
      statusIn('origin', {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no'
      })
    ).toBe(FULFILLED)
  })

  it('Should aggregate a multi-page row over every page it spans (arrival details = port of entry + transport details)', () => {
    expect(statusIn('arrivalDetails', unlocked)).toBe(NOT_STARTED)
    expect(
      statusIn('arrivalDetails', { ...unlocked, portOfEntry: 'GB ABD' })
    ).toBe(IN_PROGRESS)
    expect(
      statusIn('arrivalDetails', {
        ...unlocked,
        portOfEntry: 'GB ABD',
        arrivalDateAtPort: { day: '1', month: '2', year: '2026' },
        meansOfTransport: 'Airplane',
        transportIdentification: 'FR-892-LK',
        transportDocumentReference: 'CMR-1'
      })
    ).toBe(FULFILLED)
  })

  it('Should aggregate the transporter row over its three pages, following the type into scope', () => {
    expect(statusIn('transporter', unlocked)).toBe(NOT_STARTED)
    expect(
      statusIn('transporter', { ...unlocked, transporterType: 'Commercial' })
    ).toBe(IN_PROGRESS)
    expect(
      statusIn('transporter', {
        ...unlocked,
        transporterType: 'Commercial',
        commercialTransporter: { name: 'García SL' }
      })
    ).toBe(FULFILLED)
    expect(
      statusIn('transporter', { ...unlocked, transporterType: 'Private' })
    ).toBe(IN_PROGRESS)
    expect(
      statusIn('transporter', {
        ...unlocked,
        transporterType: 'Private',
        privateTransporter: { name: 'Jean Dupont' }
      })
    ).toBe(FULFILLED)
  })

  it('Should keep the documents row Optional until an entry starts, In progress while one is partial, Completed when full', () => {
    expect(statusIn('documents', unlocked)).toBe(OPTIONAL)
    expect(
      statusIn('documents', {
        ...unlocked,
        documents: [{ accompanyingDocumentType: 'ITAHC' }]
      })
    ).toBe(IN_PROGRESS)
    expect(
      statusIn('documents', { ...unlocked, documents: happyPath.documents })
    ).toBe(FULFILLED)
  })

  describe('the conditional transit-countries row', () => {
    it('Should be Not applicable (absent) while the means of transport is not overland', () => {
      expect(statusIn('transitCountries', unlocked)).toBe(NA)
      expect(
        statusIn('transitCountries', {
          ...unlocked,
          meansOfTransport: 'Airplane'
        })
      ).toBe(NA)
    })

    it('Should appear as Not yet started for each overland means and complete once countries are added', () => {
      for (const means of ['Railway', 'Road Vehicle']) {
        expect(
          statusIn('transitCountries', {
            ...unlocked,
            meansOfTransport: means
          })
        ).toBe(NOT_STARTED)
      }
      expect(
        statusIn('transitCountries', {
          ...unlocked,
          meansOfTransport: 'Road Vehicle',
          transitedCountries: ['FR', 'BE']
        })
      ).toBe(FULFILLED)
    })
  })

  describe('the commodities/identification facet split of commodityLines', () => {
    it('Should read Not yet started on both rows while no line exists', () => {
      expect(statusIn('commodities', {})).toBe(NOT_STARTED)
      expect(statusIn('animalIdentification', {})).toBe(NOT_STARTED)
    })

    it('Should complete the commodities row on line data alone, leaving identification Not yet started', () => {
      const answers = {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            typeSelection: 'Domestic',
            speciesSelection: ['1148346'],
            numberOfPackages: '5',
            numberOfAnimalsQuantity: '25'
          }
        ]
      }
      expect(statusIn('commodities', answers)).toBe(FULFILLED)
      expect(statusIn('animalIdentification', answers)).toBe(NOT_STARTED)
    })

    it('Should complete the identification row on identifiers alone, leaving commodities In progress', () => {
      const answers = {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
          }
        ]
      }
      expect(statusIn('animalIdentification', answers)).toBe(FULFILLED)
      expect(statusIn('commodities', answers)).toBe(IN_PROGRESS)
    })

    it('Should hold the identification row In progress while any line still owes its at-least-one identifier', () => {
      const answers = {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
          },
          { commoditySelection: 'Fish' }
        ]
      }
      expect(statusIn('animalIdentification', answers)).toBe(IN_PROGRESS)
    })

    it('Should resolve the enclosing-commodity activations through the facet (a Cat identifier owes its permanent address)', () => {
      const catLine = (identifier) => ({
        commodityLines: [
          { commoditySelection: 'Cat', animalIdentifiers: [identifier] }
        ]
      })
      expect(
        statusIn(
          'animalIdentification',
          catLine({ animalIdentifierPassport: 'UK123456789' })
        )
      ).toBe(IN_PROGRESS)
      expect(
        statusIn(
          'animalIdentification',
          catLine({
            animalIdentifierPassport: 'UK123456789',
            permanentAddress: { name: 'Pet Owner' }
          })
        )
      ).toBe(FULFILLED)
    })
  })
})

describe('#rowGatePasses / #rowEntry — a row is gated exactly as its first page is', () => {
  it('Should open only the origin row on a blank journey', () => {
    const scope = makeScope({})
    for (const row of taskRows) {
      expect(rowGatePasses(row, scope)).toBe(row.id === 'origin')
    }
  })

  it('Should unlock every row once the origin and a commodity line are answered', () => {
    const scope = makeScope(unlocked)
    for (const row of taskRows.filter((r) => r.id !== 'transitCountries')) {
      expect(rowGatePasses(row, scope)).toBe(true)
    }
  })

  it('Should enter a multi-page row at its first gate-passing page', () => {
    const scope = makeScope(unlocked)
    expect(rowEntry(taskRowById('arrivalDetails'), scope)).toMatch(
      /\/port-of-entry$/
    )
    expect(rowEntry(taskRowById('transporter'), scope)).toMatch(
      /\/transporters$/
    )
    expect(rowEntry(taskRowById('addresses'), scope)).toMatch(/\/addresses$/)
  })
})

describe('submit-readiness equivalence — the row roll-up admits exactly the journeys the section roll-up did', () => {
  const PASSING = [FULFILLED, NA, OPTIONAL]
  const sectionRollUp = (answers, inScope) =>
    answerSections.every((section) =>
      PASSING.includes(sectionStatus(section, answers, inScope))
    )

  const submittable = {
    'the happy path': happyPath,
    'the happy path by air (the conditional transit row is Not applicable)': {
      ...happyPath,
      meansOfTransport: 'Airplane',
      transitedCountries: []
    },
    'the happy path with a private transporter': {
      ...happyPath,
      transporterType: 'Private',
      commercialTransporter: null
    }
  }

  const notSubmittable = {
    'a blank journey': {},
    'an origin-only journey': { countryOfOrigin: 'FR' },
    'an unlocked skeleton journey': unlocked,
    'the happy path without a reason': { ...happyPath, reasonForImport: '' },
    'the happy path without certified-for': {
      ...happyPath,
      animalsCertifiedFor: ''
    },
    'the happy path without identifiers': {
      ...happyPath,
      commodityLines: [
        { ...happyPath.commodityLines[0], animalIdentifiers: [] }
      ]
    },
    'the happy path without the line taxonomy': {
      ...happyPath,
      commodityLines: [{ ...happyPath.commodityLines[0], typeSelection: '' }]
    },
    'the happy path owing transit countries': {
      ...happyPath,
      transitedCountries: []
    },
    'the happy path with a partial document': {
      ...happyPath,
      documents: [{ accompanyingDocumentType: 'ITAHC' }]
    },
    'the happy path without a contact': { ...happyPath, contactAddress: null },
    'the happy path without an importer': { ...happyPath, importer: null }
  }

  it.each(Object.entries({ ...submittable, ...notSubmittable }))(
    'Should agree with the retired section roll-up for %s',
    (label, answers) => {
      const { inScope } = reconcile(answers)
      expect(readyForCheckYourAnswers(answers, inScope)).toBe(
        sectionRollUp(answers, inScope)
      )
    }
  )

  it.each(Object.entries(submittable))(
    'Should hold %s submittable',
    (label, answers) => {
      const { inScope } = reconcile(answers)
      expect(readyForCheckYourAnswers(answers, inScope)).toBe(true)
    }
  )

  it.each(Object.entries(notSubmittable))(
    'Should hold %s not submittable',
    (label, answers) => {
      const { inScope } = reconcile(answers)
      expect(readyForCheckYourAnswers(answers, inScope)).toBe(false)
    }
  )

  it('Should keep the review section gated on the row roll-up exactly as before', () => {
    const review = sections.find((section) => section.id === 'review')
    expect(sectionGatePasses(review, makeScope({}))).toBe(false)
    expect(sectionGatePasses(review, makeScope(happyPath))).toBe(true)
  })
})
