import { SET_ID } from '../sets/live-animals/set.js'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, it, expect } from 'vitest'
import { rawInScope } from './scope.js'
import { configureReadyForCheckYourAnswers, makeScope } from '../engine/read.js'
import { evaluateAnswers } from './evaluation.js'

const happyPath = JSON.parse(
  readFileSync(
    new URL(
      '../sets/live-animals/journeys/linear/flow/fixtures/happy-path.json',
      import.meta.url
    )
  )
).values

// Pin readiness false through the test override seam.
beforeAll(() => configureReadyForCheckYourAnswers(SET_ID, () => false))

const resolveRegion = (answers) => ({
  regionOfOriginCodeRequirement: 'yes',
  regionOfOriginCode: 'FR-75',
  ...answers
})

const FIRST_LINE_COMMODITY_CODE = 'commodityLines[0].commodityCode'

const line = (commodityCode, speciesLatinName, units) => ({
  commodityCode,
  speciesLatinName,
  numberOfAnimalsQuantity: String(units.length),
  animalIdentifiers: units
})

describe('scope bridge — per-gate scoping', () => {
  it('Should keep regionOfOriginCode in scope whatever the requirement answers (retain-value)', () => {
    expect(
      makeScope(resolveRegion({ countryOfOrigin: 'FR' })).has(
        'regionOfOriginCode'
      )
    ).toBe(true)
    expect(
      makeScope({
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCode: 'FR-75'
      }).has('regionOfOriginCode')
    ).toBe(true)
    expect(makeScope({ countryOfOrigin: 'FR' }).has('regionOfOriginCode')).toBe(
      true
    )
  })

  it('Should scope purposeInInternalMarket only under the internalMarket reason', () => {
    expect(
      makeScope(
        resolveRegion({
          reasonForImport: 'internalMarket',
          purposeInInternalMarket: 'breeding'
        })
      ).has('purposeInInternalMarket')
    ).toBe(true)
    expect(
      makeScope(resolveRegion({ reasonForImport: 'research' })).has(
        'purposeInInternalMarket'
      )
    ).toBe(false)
  })

  it('Should scope the commercial transporter + land-transit branch', () => {
    const scope = makeScope(
      resolveRegion({
        transporterType: 'Commercial',
        meansOfTransport: 'ROAD_VEHICLE',
        transitedCountries: ['FR']
      })
    )
    expect(scope.has('commercialTransporter')).toBe(true)
    expect(scope.has('transitedCountries')).toBe(true)
  })

  it('Should scope the private transporter + non-land branch', () => {
    const scope = makeScope(
      resolveRegion({
        transporterType: 'Private',
        meansOfTransport: 'AIRPLANE'
      })
    )
    expect(scope.has('privateTransporter')).toBe(true)
    expect(scope.has('transitedCountries')).toBe(false)
  })

  it('Should project positional keys across multi-line / multi-unit answers', () => {
    const scope = makeScope(
      resolveRegion({
        commodityLines: [
          line('0102', 'Bos taurus', [
            { animalIdentifierEarTag: 'UK111' },
            { animalIdentifierEarTag: 'UK222' }
          ]),
          line('0101', 'Equus cabalus', [{ horseName: 'Dobbin' }])
        ]
      })
    )
    expect(scope.has(FIRST_LINE_COMMODITY_CODE)).toBe(true)
    expect(scope.has('commodityLines[1].commodityCode')).toBe(true)
  })

  it('Should keep the group node in scope for an empty required collection', () => {
    const scope = makeScope(resolveRegion({ commodityLines: [] }))
    expect(scope.has('commodityLines')).toBe(true)
    expect(scope.has(FIRST_LINE_COMMODITY_CODE)).toBe(false)
  })
})

describe('scope bridge — flow-only obligations layered on the full scope', () => {
  it('Should add declaration to the full scope, not the raw projection', () => {
    const full = makeScope(happyPath).inScope
    const raw = rawInScope(evaluateAnswers(happyPath))
    expect(full.has('declaration')).toBe(true)
    expect(raw.has('declaration')).toBe(false)
  })

  it('Should carry the system field and nested commodity field the raw projection owns', () => {
    const raw = rawInScope(evaluateAnswers(happyPath))
    expect(raw.has('poApprovedReferenceNumber')).toBe(true)
    expect(raw.has('commodityLines[0].commodityType')).toBe(true)
  })

  it('Should carry the documents collection', () => {
    const full = makeScope(happyPath).inScope
    expect(full.has('documents')).toBe(true)
    expect(full.has('documents[0].accompanyingDocumentType')).toBe(true)
  })
})

describe('scope bridge — makeScope result', () => {
  it('Should return inScope as a Set, has and answered as functions and readyForCheckYourAnswers as a boolean', () => {
    const scope = makeScope(happyPath)
    expect(scope.inScope).toBeInstanceOf(Set)
    expect(typeof scope.has).toBe('function')
    expect(typeof scope.answered).toBe('function')
    expect(typeof scope.readyForCheckYourAnswers).toBe('boolean')
  })

  it('Should read the projected inScope set via has(id)', () => {
    const scope = makeScope(happyPath)
    expect(scope.has('countryOfOrigin')).toBe(true)
    expect(scope.has(FIRST_LINE_COMMODITY_CODE)).toBe(true)
    expect(scope.has('nonExistent')).toBe(false)
  })

  it('Should read whether an obligation instance is answered via answered(id)', () => {
    const scope = makeScope(happyPath)
    expect(scope.answered('countryOfOrigin')).toBe(true)
    expect(scope.answered('commodityCode')).toBe(true)
    expect(scope.answered('portOfEntry')).toBe(true)
  })
})
