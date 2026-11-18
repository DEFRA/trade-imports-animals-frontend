import { EventEmitter } from 'node:events'
import { vi } from 'vitest'

import { reportRedisConnectionEvents } from './redis-connection-events.js'
import { readEmfDocuments } from '../test-helpers/emf-documents.js'
import { recordEcsLogLines } from '../test-helpers/ecs-log-lines.js'

const ONE_MINUTE_MS = 60_000
const AVAILABLE = 'external.dependency.available'
const ERROR = 'external.dependency.error'

const valuesOf = (logSpy, metricName) =>
  readEmfDocuments(logSpy)
    .filter((document) => metricName in document)
    .map((document) => document[metricName])

const availabilityLines = (lines) =>
  lines
    .filter((line) => line.message?.startsWith('Redis is '))
    .map((line) => ({ level: line['log.level'], message: line.message }))

const errorLines = (lines) =>
  lines
    .filter((line) => line.message === 'Redis connection error')
    .map((line) => ({
      level: line['log.level'],
      dependency: line.dependency,
      error: line.error?.message
    }))

describe('reportRedisConnectionEvents', () => {
  const ecsLog = recordEcsLogLines()
  let logSpy
  let client

  const eventually = (assertion) => vi.waitFor(assertion)

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval'] })
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    client = new EventEmitter()
    reportRedisConnectionEvents(client)
  })

  afterEach(() => {
    vi.useRealTimers()
    logSpy.mockRestore()
  })

  test('publishes nothing before the client reports a state', async () => {
    vi.advanceTimersByTime(ONE_MINUTE_MS)
    client.emit('error', new Error('ECONNREFUSED'))

    await eventually(() => expect(valuesOf(logSpy, ERROR)).toEqual([1]))
    expect(valuesOf(logSpy, AVAILABLE)).toEqual([])
  })

  test('publishes 1 tagged dependency redis once ready, and again every minute', async () => {
    client.emit('ready')
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await eventually(() => expect(valuesOf(logSpy, AVAILABLE)).toEqual([1, 1]))
    const [document] = readEmfDocuments(logSpy)
    expect(document._aws.CloudWatchMetrics[0]).toEqual(
      expect.objectContaining({
        Dimensions: [['dependency']],
        Metrics: [{ Name: AVAILABLE, Unit: 'None' }]
      })
    )
    expect(document.dependency).toBe('redis')
  })

  test('a ready client that closes publishes 0, counts one lost connection and logs each change once', async () => {
    client.emit('ready')
    client.emit('close')
    client.emit('end')

    await eventually(() => {
      expect(valuesOf(logSpy, AVAILABLE)).toEqual([1, 0])
      expect(valuesOf(logSpy, 'external.dependency.connection.lost')).toEqual([
        1
      ])
    })
    expect(availabilityLines(ecsLog.lines())).toEqual([
      { level: 'info', message: 'Redis is available' },
      { level: 'warn', message: 'Redis is unavailable' }
    ])
  })

  test('a client that never connected and closes counts no lost connection', async () => {
    client.emit('close')

    await eventually(() => expect(valuesOf(logSpy, AVAILABLE)).toEqual([0]))
    expect(valuesOf(logSpy, 'external.dependency.connection.lost')).toEqual([])
  })

  test('each client error is logged with its error and counted, tagged dependency redis', async () => {
    client.emit('error', new Error('ECONNREFUSED'))
    client.emit('error', new Error('ECONNREFUSED'))

    await eventually(() => expect(valuesOf(logSpy, ERROR)).toEqual([1, 1]))
    const refusedLine = {
      level: 'error',
      dependency: 'redis',
      error: 'ECONNREFUSED'
    }
    expect(errorLines(ecsLog.lines())).toEqual([refusedLine, refusedLine])
  })

  test('each error a Cluster client reports from one of its nodes is logged and counted, tagged dependency redis', async () => {
    client.emit('node error', new Error('ECONNREFUSED'), '10.0.0.1:6379')

    await eventually(() => expect(valuesOf(logSpy, ERROR)).toEqual([1]))
    expect(errorLines(ecsLog.lines())).toEqual([
      { level: 'error', dependency: 'redis', error: 'ECONNREFUSED' }
    ])
  })
})
