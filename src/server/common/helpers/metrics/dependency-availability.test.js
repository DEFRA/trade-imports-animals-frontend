import { vi } from 'vitest'

import {
  measureExternalCall,
  measureExternalResponse
} from './external-call-metrics.js'
import {
  availabilityPublish,
  recordEmfDocuments
} from '../../test-helpers/emf-documents.js'

const ONE_MINUTE_MS = 60_000

const answerWith = (dependency, status) =>
  measureExternalResponse({ dependency, operation: 'get-thing' }, async () => {
    return new Response(null, { status })
  })

describe('the availability of an HTTP dependency, from its most recent call', () => {
  const emf = recordEmfDocuments()

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['setInterval'] })
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  test('a dependency publishes nothing before its first call, even after a minute, nor at the call, and its availability at the minute after it', async () => {
    const dependency = 'first-call'

    vi.advanceTimersByTime(ONE_MINUTE_MS)
    await answerWith(dependency, 200)
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.availabilityOf(dependency)).toEqual([
      availabilityPublish(dependency, 1)
    ])
  })

  test('after a successful call it publishes 1, tagged dependency alone, every minute', async () => {
    const dependency = 'answering'

    await answerWith(dependency, 200)
    vi.advanceTimersByTime(ONE_MINUTE_MS)
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.availabilityOf(dependency)).toEqual([
      availabilityPublish(dependency, 1),
      availabilityPublish(dependency, 1)
    ])
  })

  test('after a 5xx answer it publishes 0, and after a later 404 answer 1, as the call failure rule judges them', async () => {
    const dependency = 'recovering'

    await answerWith(dependency, 503)
    vi.advanceTimersByTime(ONE_MINUTE_MS)
    await answerWith(dependency, 404)
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.availabilityOf(dependency)).toEqual([
      availabilityPublish(dependency, 0),
      availabilityPublish(dependency, 1)
    ])
  })

  test('after a call that throws with no answer it publishes 0', async () => {
    const dependency = 'refusing'
    const refused = new TypeError('fetch failed')

    await expect(
      measureExternalCall({ dependency, operation: 'get-thing' }, async () => {
        throw refused
      })
    ).rejects.toBe(refused)
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.availabilityOf(dependency)).toEqual([
      availabilityPublish(dependency, 0)
    ])
  })

  test('a minute holding a failed call and then a successful one publishes 1 once, the outcome of the most recent', async () => {
    const dependency = 'flapping'

    await answerWith(dependency, 500)
    await answerWith(dependency, 200)
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.availabilityOf(dependency)).toEqual([
      availabilityPublish(dependency, 1)
    ])
  })

  test('each dependency publishes its own availability', async () => {
    await answerWith('up', 200)
    await answerWith('down', 502)
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.availabilityOf('up')).toEqual([availabilityPublish('up', 1)])
    expect(emf.availabilityOf('down')).toEqual([availabilityPublish('down', 0)])
  })
})
