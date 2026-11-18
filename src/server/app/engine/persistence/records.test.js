import { SET_ID } from '../../../../../test/fixtures/index.js'
import { vi } from 'vitest'

import { configureRecords, records } from './records.js'
import { store } from '../store.js'
import { records as recordsStub } from '../../services/persistence/records/stub/index.js'
import { readEmfDocuments } from '../../../common/test-helpers/emf-documents.js'

const STARTED = 'journey.started'
const CONFLICT = 'journey.concurrency.conflict'
const JOURNEY_METRICS = [
  STARTED,
  'journey.submitted',
  'journey.amended',
  'journey.copied',
  'journey.deleted',
  CONFLICT
]

const journeyCounts = (logSpy) =>
  readEmfDocuments(logSpy).flatMap((document) =>
    JOURNEY_METRICS.filter((name) => name in document).map((name) => ({
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
          STARTED,
          'journey.submitted',
          'journey.amended',
          'journey.copied',
          'journey.deleted'
        )
      )
    )
  })

  test('a save the store refuses for a stale concurrency token counts one conflict and rethrows the refusal', async () => {
    const started = await records.create()
    await records.replaceFulfilment(started.journeyId, {}, { known: started })

    await expect(
      records.replaceFulfilment(started.journeyId, {}, { known: started })
    ).rejects.toMatchObject({ code: 'STALE_CONCURRENCY_TOKEN' })

    await vi.waitFor(() =>
      expect(journeyCounts(logSpy)).toEqual(counted(STARTED, CONFLICT))
    )
  })

  test('a submit the store refuses counts no submission', async () => {
    const started = await records.create()

    await expect(
      records.finalise(started.journeyId, undefined, 99)
    ).rejects.toMatchObject({ code: 'STALE_CONCURRENCY_TOKEN' })

    await vi.waitFor(() =>
      expect(journeyCounts(logSpy)).toEqual(counted(STARTED, CONFLICT))
    )
  })
})
