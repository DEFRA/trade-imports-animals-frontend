import { pagePath } from '../../../../../shared/paths.js'
import { SET_ID } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { completeNotification } from '../../../../../engine/test-support.js'
import { makeScope } from '../../../../../engine/index.js'
import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../../../../bridge/status/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { answerSections, sections } from './flow.js'
import {
  readyForCheckYourAnswers,
  sectionStatus
} from '../../../../../flow/section-status.js'
import { rowEntry } from '../../../../../flow/navigation.js'
import { sectionGatePasses } from '../../../../../flow/gates.js'
import { rowStatus, taskRowById, taskRows } from './task-rows.js'
import {
  BOS_TAURUS_ROW,
  EQUUS_CABALUS_ROW,
  FELIS_CATUS_ROW,
  STRUTHIO_ROW
} from '../features/commodities/search/test-support.js'

const happyPath = completeNotification()

const statusIn = (rowId, answers) => {
  const evaluation = evaluateAnswers(answers)
  return rowStatus(
    taskRowById(rowId),
    answers,
    makeScope(answers).inScope,
    evaluation
  )
}

const unlocked = {
  countryOfOrigin: 'FR',
  commodityLines: [{ commodityCode: FELIS_CATUS_ROW.commodityCode }]
}

beforeAll(() => {
  buildDispatch(SET_ID, dispatchPages)
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

  it('Should complete the origin row only once a country is chosen and the region question is answered, with a code under Yes', () => {
    expect(statusIn('origin', { countryOfOrigin: 'FR' })).toBe(IN_PROGRESS)
    expect(
      statusIn('origin', {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes'
      })
    ).toBe(IN_PROGRESS)
    expect(
      statusIn('origin', {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no'
      })
    ).toBe(FULFILLED)
    expect(
      statusIn('origin', {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'FR-75'
      })
    ).toBe(FULFILLED)
  })

  it('Should walk the import-reason row through Not yet started, In progress and Completed for the reasons that open a reveal', () => {
    expect(statusIn('importReason', unlocked)).toBe(NOT_STARTED)
    expect(
      statusIn('importReason', { ...unlocked, reasonForImport: 'transit' })
    ).toBe(IN_PROGRESS)
    expect(
      statusIn('importReason', {
        ...unlocked,
        reasonForImport: 'transit',
        destinationCountry: 'IE',
        portOfExit: 'GB DVR'
      })
    ).toBe(FULFILLED)
    expect(
      statusIn('importReason', {
        ...unlocked,
        reasonForImport: 'temporaryAdmissionHorses',
        portOfExit: 'GB DVR'
      })
    ).toBe(IN_PROGRESS)
    expect(
      statusIn('importReason', {
        ...unlocked,
        reasonForImport: 'temporaryAdmissionHorses',
        portOfExit: 'GB DVR',
        exitDate: { day: '20', month: '12', year: '2026' }
      })
    ).toBe(FULFILLED)
  })

  it('Should walk the arrival-details row over the merged page (all five arrival and transport collects)', () => {
    expect(statusIn('arrivalDetails', unlocked)).toBe(NOT_STARTED)
    expect(
      statusIn('arrivalDetails', { ...unlocked, portOfEntry: 'GB ABD' })
    ).toBe(IN_PROGRESS)
    expect(
      statusIn('arrivalDetails', {
        ...unlocked,
        portOfEntry: 'GB ABD',
        arrivalDateAtPort: { day: '1', month: '2', year: '2026' },
        meansOfTransport: 'AIRPLANE',
        transportIdentification: 'FR-892-LK',
        transportDocumentReference: 'CMR-1'
      })
    ).toBe(FULFILLED)
  })

  it('Should aggregate the transporter row over the three answers the list declares, following the type into scope', () => {
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
})

describe('#rowStatus — the commodities/details/identification facet split of commodityLines', () => {
  it('Should read Not yet started on the commodities and details rows while no line exists', () => {
    expect(statusIn('commodities', {})).toBe(NOT_STARTED)
    expect(statusIn('consignmentDetails', {})).toBe(NOT_STARTED)
  })

  it('Should complete the commodities row on the selection while the details row still owes the numbers', () => {
    const answers = {
      commodityLines: [
        {
          ...BOS_TAURUS_ROW,
          commodityType: '16'
        }
      ]
    }
    expect(statusIn('commodities', answers)).toBe(FULFILLED)
    expect(statusIn('consignmentDetails', answers)).toBe(NOT_STARTED)
  })

  it('Should complete the details row on the numbers alone, leaving the commodities row In progress', () => {
    const answers = {
      commodityLines: [
        {
          commodityCode: BOS_TAURUS_ROW.commodityCode,
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25'
        }
      ]
    }
    expect(statusIn('consignmentDetails', answers)).toBe(FULFILLED)
    expect(statusIn('commodities', answers)).toBe(IN_PROGRESS)
  })

  it('Should hold the details row In progress while a second line still owes its animal count', () => {
    const answers = {
      commodityLines: [
        {
          ...BOS_TAURUS_ROW,
          commodityType: '16',
          numberOfAnimalsQuantity: '25'
        },
        {
          ...EQUUS_CABALUS_ROW,
          commodityType: '2'
        }
      ]
    }
    expect(statusIn('commodities', answers)).toBe(FULFILLED)
    expect(statusIn('consignmentDetails', answers)).toBe(IN_PROGRESS)
  })

  it('Should complete the commodities and details rows on line data alone, owing no identifier on a single species', () => {
    const answers = {
      commodityLines: [
        {
          ...BOS_TAURUS_ROW,
          commodityType: '16',
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25'
        }
      ]
    }
    expect(statusIn('commodities', answers)).toBe(FULFILLED)
    expect(statusIn('consignmentDetails', answers)).toBe(FULFILLED)
    expect(statusIn('animalIdentification', answers)).toBe(FULFILLED)
  })

  it('Should leave the identification row Not yet started while a second species owes its first identifier', () => {
    const answers = {
      commodityLines: [
        {
          ...BOS_TAURUS_ROW,
          commodityType: '16',
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25'
        },
        {
          ...EQUUS_CABALUS_ROW,
          commodityType: '2',
          numberOfPackages: '3',
          numberOfAnimalsQuantity: '4'
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
          commodityCode: BOS_TAURUS_ROW.commodityCode,
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
          commodityCode: BOS_TAURUS_ROW.commodityCode,
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
        },
        { commodityCode: EQUUS_CABALUS_ROW.commodityCode }
      ]
    }
    expect(statusIn('animalIdentification', answers)).toBe(IN_PROGRESS)
  })

  it('Should ask no animal records of a line whose commodity carries no identifier of its own', () => {
    const answers = {
      commodityLines: [
        {
          commodityCode: BOS_TAURUS_ROW.commodityCode,
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
        },
        { commodityCode: STRUTHIO_ROW.commodityCode }
      ]
    }
    expect(statusIn('animalIdentification', answers)).toBe(FULFILLED)
  })

  it('Should resolve the enclosing-commodity activations through the facet (a Cat identifier owes its permanent address)', () => {
    const catLine = (identifier) => ({
      commodityLines: [
        {
          ...FELIS_CATUS_ROW,
          animalIdentifiers: [identifier]
        }
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

describe('#rowStatus — the conditional animal-identification row', () => {
  it('Should be Not applicable (absent) on a notification with no commodity', () => {
    expect(statusIn('animalIdentification', {})).toBe(NA)
    expect(statusIn('animalIdentification', { countryOfOrigin: 'FR' })).toBe(NA)
  })

  it('Should be Not applicable (absent) while no chosen commodity carries an identifier', () => {
    expect(
      statusIn('animalIdentification', {
        countryOfOrigin: 'FR',
        commodityLines: [{ commodityCode: STRUTHIO_ROW.commodityCode }]
      })
    ).toBe(NA)
  })

  it('Should read Completed as soon as one chosen commodity carries an identifier', () => {
    expect(
      statusIn('animalIdentification', {
        countryOfOrigin: 'FR',
        commodityLines: [
          { commodityCode: STRUTHIO_ROW.commodityCode },
          { commodityCode: BOS_TAURUS_ROW.commodityCode }
        ]
      })
    ).toBe(FULFILLED)
  })

  it('Should mark the animal-identification row conditional', () => {
    expect(taskRowById('animalIdentification').conditional).toBe(true)
  })
})

describe('#rowStatus — the conditional transit-countries row', () => {
  it('Should be Not applicable (absent) while the means of transport is not overland', () => {
    expect(statusIn('transitCountries', unlocked)).toBe(NA)
    expect(
      statusIn('transitCountries', {
        ...unlocked,
        meansOfTransport: 'AIRPLANE'
      })
    ).toBe(NA)
  })

  it('Should appear as Optional for each overland means and complete once countries are added', () => {
    for (const means of ['RAILWAY', 'ROAD_VEHICLE']) {
      expect(
        statusIn('transitCountries', {
          ...unlocked,
          meansOfTransport: means
        })
      ).toBe(OPTIONAL)
    }
    expect(
      statusIn('transitCountries', {
        ...unlocked,
        meansOfTransport: 'ROAD_VEHICLE',
        transitedCountries: ['FR', 'BE']
      })
    ).toBe(FULFILLED)
  })
})

describe('#rowEntry — every row opens on a page, in any order', () => {
  const entryOf = (row, answers) =>
    rowEntry(row, makeScope(answers), 'journey-1')

  it('Should give every row a page of its own to open on a blank journey — never the hub', () => {
    for (const row of taskRows) {
      expect(entryOf(row, {}), `${row.id} has no way in`).toBe(
        pagePath('journey-1', row.pages[0].slug)
      )
    }
  })

  it('Should still open every row once the origin and a commodity line are answered', () => {
    for (const row of taskRows) {
      expect(entryOf(row, unlocked)).not.toBe('/notifications/journey-1')
    }
  })

  it('Should enter a row at its first gate-passing page', () => {
    const scope = makeScope(unlocked)
    expect(rowEntry(taskRowById('commodities'), scope, 'journey-1')).toMatch(
      /\/commodities$/
    )
    expect(
      rowEntry(taskRowById('consignmentDetails'), scope, 'journey-1')
    ).toMatch(/\/consignment-details$/)
    expect(rowEntry(taskRowById('arrivalDetails'), scope, 'journey-1')).toMatch(
      /\/port-of-entry$/
    )
    expect(rowEntry(taskRowById('transporter'), scope, 'journey-1')).toMatch(
      /\/transporters$/
    )
    expect(rowEntry(taskRowById('addresses'), scope, 'journey-1')).toMatch(
      /\/addresses$/
    )
  })
})

describe('submit-readiness equivalence — the row roll-up and the section roll-up admit the same journeys', () => {
  const PASSING = [FULFILLED, NA, OPTIONAL]
  const sectionRollUp = (answers, inScope, evaluation) =>
    answerSections.every((section) =>
      PASSING.includes(sectionStatus(section, answers, inScope, evaluation))
    )

  const horseLine = {
    ...EQUUS_CABALUS_ROW,
    commodityType: '2',
    numberOfPackages: '3',
    numberOfAnimalsQuantity: '4'
  }

  const submittable = {
    'the happy path': happyPath,
    'the happy path by air (the conditional transit row is Not applicable)': {
      ...happyPath,
      meansOfTransport: 'AIRPLANE',
      transitedCountries: []
    },
    'the happy path with a private transporter': {
      ...happyPath,
      transporterType: 'Private',
      commercialTransporter: null
    },
    'the happy path leaving transit countries empty': {
      ...happyPath,
      transitedCountries: []
    },
    'the happy path without identifiers on its single species': {
      ...happyPath,
      commodityLines: [
        { ...happyPath.commodityLines[0], animalIdentifiers: [] }
      ]
    },
    'the happy path declaring more animals than it identifies': {
      ...happyPath,
      commodityLines: [
        { ...happyPath.commodityLines[0], numberOfAnimalsQuantity: '2' }
      ]
    },
    'two identified species carrying one identifier each': {
      ...happyPath,
      commodityLines: [
        ...happyPath.commodityLines,
        { ...horseLine, animalIdentifiers: [{ horseName: 'Shergar' }] }
      ]
    }
  }

  const notSubmittable = {
    'a blank journey': {},
    'an origin-only journey': { countryOfOrigin: 'FR' },
    'an unlocked skeleton journey': unlocked,
    'the happy path without a reason': { ...happyPath, reasonForImport: '' },
    'the happy path for temporary admission without an exit date': {
      ...happyPath,
      reasonForImport: 'temporaryAdmissionHorses',
      portOfExit: 'GB DVR'
    },
    'the happy path without certified-for': {
      ...happyPath,
      animalsCertifiedFor: ''
    },
    'the happy path without the species': {
      ...happyPath,
      commodityLines: [{ ...happyPath.commodityLines[0], speciesLatinName: '' }]
    },
    'the happy path with a partial document': {
      ...happyPath,
      documents: [{ accompanyingDocumentType: 'ITAHC' }]
    },
    'the happy path without a contact': { ...happyPath, contactAddress: null },
    'the happy path without an importer': { ...happyPath, importer: null },
    'a second identified species carrying no identifier': {
      ...happyPath,
      commodityLines: [...happyPath.commodityLines, horseLine]
    }
  }

  it.each(Object.entries({ ...submittable, ...notSubmittable }))(
    'Should agree with the section roll-up for %s',
    (_label, answers) => {
      const { inScope } = makeScope(answers)
      const evaluation = evaluateAnswers(answers)
      expect(readyForCheckYourAnswers(answers, inScope, evaluation)).toBe(
        sectionRollUp(answers, inScope, evaluation)
      )
    }
  )

  it.each(Object.entries(submittable))(
    'Should hold %s submittable',
    (_label, answers) => {
      const { inScope } = makeScope(answers)
      expect(
        readyForCheckYourAnswers(answers, inScope, evaluateAnswers(answers))
      ).toBe(true)
    }
  )

  it.each(Object.entries(notSubmittable))(
    'Should hold %s not submittable',
    (_label, answers) => {
      const { inScope } = makeScope(answers)
      expect(
        readyForCheckYourAnswers(answers, inScope, evaluateAnswers(answers))
      ).toBe(false)
    }
  )

  it('Should gate the review section on the row roll-up', () => {
    const review = sections.find((section) => section.id === 'review')
    expect(sectionGatePasses(review, makeScope({}))).toBe(false)
    expect(sectionGatePasses(review, makeScope(happyPath))).toBe(true)
  })
})
