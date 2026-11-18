import { SET_ID } from '../../../../../test/fixtures/index.js'
import { vi } from 'vitest'

import {
  configureRecords,
  records,
  STALE_CONCURRENCY_TOKEN
} from './records.js'
import { store } from '../store.js'
import { records as recordsStub } from '../../services/persistence/records/stub/index.js'
import { readEmfDocuments } from '../../../common/test-helpers/emf-documents.js'

const JOURNEY_EVENTS = Object.freeze({
  started: 'journey.started',
  submitted: 'journey.submitted',
  amended: 'journey.amended',
  copied: 'journey.copied',
  deleted: 'journey.deleted',
  conflict: 'journey.concurrency.conflict'
})

const journeyCounts = (logSpy) =>
  readEmfDocuments(logSpy).flatMap((document) =>
    Object.values(JOURNEY_EVENTS)
      .filter((name) => name in document)
      .map((name) => ({
        name,
        value: document[name],
        dimensions: document._aws.CloudWatchMetrics[0].Dimensions
      }))
  )

const counted = (...names) =>
  names.map((name) => ({ name, value: 1, dimensions: [[]] }))

describe('records journey counters', () => {
  let logSpy

  beforeEach(async () => {
    configureRecords(SET_ID, recordsStub)
    await store.clear()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  test('starting, submitting, amending, copying and deleting a journey each count one event with no dimensions', async () => {
    const started = await records.create()
    const submitted = await records.finalise(
      started.journeyId,
      undefined,
      started.concurrencyToken
    )
    await records.amend(started.journeyId)
    await records.copy(started.journeyId, submitted.concurrencyToken)
    await records.softDelete(started.journeyId)

    await vi.waitFor(() =>
      expect(journeyCounts(logSpy)).toEqual(
        counted(
          JOURNEY_EVENTS.started,
          JOURNEY_EVENTS.submitted,
          JOURNEY_EVENTS.amended,
          JOURNEY_EVENTS.copied,
          JOURNEY_EVENTS.deleted
        )
      )
    )
  })

  test('a save the store refuses for a stale concurrency token counts one conflict and rethrows the refusal', async () => {
    const started = await records.create()
    await records.replaceFulfilment(started.journeyId, {}, { known: started })

    await expect(
      records.replaceFulfilment(started.journeyId, {}, { known: started })
    ).rejects.toMatchObject({ code: STALE_CONCURRENCY_TOKEN })

    await vi.waitFor(() =>
      expect(journeyCounts(logSpy)).toEqual(
        counted(JOURNEY_EVENTS.started, JOURNEY_EVENTS.conflict)
      )
    )
  })

  test('a submit the store refuses for a stale concurrency token counts one conflict and no submission, and rethrows the refusal', async () => {
    const started = await records.create()

    await expect(
      records.finalise(started.journeyId, undefined, 99)
    ).rejects.toMatchObject({ code: STALE_CONCURRENCY_TOKEN })

    await vi.waitFor(() =>
      expect(journeyCounts(logSpy)).toEqual(
        counted(JOURNEY_EVENTS.started, JOURNEY_EVENTS.conflict)
      )
    )
  })
})
