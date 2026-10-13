import { SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  stubH,
  journeyRequest
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { leaves, isCopyLeaf } from '../../../../../../../shared/copy-leaves.js'

import { routes } from '../controller.js'
import { copy } from './copy.en.js'

describe('#copy', () => {
  it('Should have a non-empty string or copy function at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${path} must be copy`).toBe(true)
    }
  })

  it('Should interpolate the parameterised leaves', () => {
    expect(copy.resubmitTitle).toBe('Review before re-submitting')
    expect(copy.viewHeader.dateCreated('22 July 2026')).toBe(
      'Date created: 22 July 2026'
    )
    expect(copy.viewHeader.dateSubmitted('22 July 2026')).toBe(
      'Date submitted: 22 July 2026'
    )
    expect(copy.identifierTable.animalN(2)).toBe('Animal 2')
    expect(copy.documentN(1)).toBe('Document 1')
    expect(copy.hidden.documentN(2)).toBe('document 2')
    expect(copy.hidden.numberOfAnimalsFor('Bos Taurus')).toBe(
      'number of animals for Bos Taurus'
    )
    expect(copy.identifierTable.animalNamed('Bos taurus', 2)).toBe(
      'Bos taurus 2'
    )
    expect(copy.hidden.identificationDetailsFor('Bos Taurus')).toBe(
      'identification details for Bos Taurus'
    )
    expect(copy.errors.species.numberOfAnimals('felis catus')).toBe(
      'Enter the number of animals for felis catus'
    )
    expect(copy.errors.species.atLeastOneIdentifier('felis catus')).toBe(
      'Enter at least 1 animal identifier for felis catus'
    )
  })
})

describe('GET check-answers — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const journey = await store.create()
    const h = stubH()
    const handler = routes.find((route) => route.method === 'GET').handler
    await handler(journeyRequest(journey.journeyId), h)
    const { context } = h.captured.view
    expect(context.copy).toBe(copy)
    expect(context.pageTitle).toBe(journey.journeyId)
    expect(context.sharedCopy.layout.serviceName).toBe(
      'Import notification service'
    )
  })
})
