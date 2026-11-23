import { EventEmitter } from 'node:events'
import { vi } from 'vitest'

import { reportRedisConnectionEvents } from './redis-connection-events.js'
import {
  DEPENDENCY_AVAILABLE,
  availabilityPublish,
  recordEmfDocuments
} from '../test-helpers/emf-documents.js'
import { recordEcsLogLines } from '../test-helpers/ecs-log-lines.js'

const ONE_MINUTE_MS = 60_000
const ERROR = 'external.dependency.error'
const CONNECTION_LOST = 'external.dependency.connection.lost'
const AVAILABLE_LINE = { level: 'info', message: 'Redis is available' }
const UNAVAILABLE_LINE = { level: 'warn', message: 'Redis is unavailable' }
const STOPPED_RECONNECTING_LINE = {
  level: 'error',
  message: 'Redis client stopped reconnecting'
}

describe('reportRedisConnectionEvents', () => {
  const ecsLog = recordEcsLogLines()
  const emf = recordEmfDocuments()

  const connectionErrorLines = () =>
    ecsLog.linesWithMessage('Redis connection error').map((line) => ({
      level: line['log.level'],
      dependency: line.dependency,
      error: line.error?.message,
      serverAddress: line.server?.address
    }))
  let client

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['setInterval'] })
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    client = new EventEmitter()
    reportRedisConnectionEvents(client)
  })

  test('publishes no availability before the client is ready or closes, even after a minute', async () => {
    vi.advanceTimersByTime(ONE_MINUTE_MS)
    client.emit('error', new Error('ECONNREFUSED'))

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.valuesOf(ERROR)).toEqual([1])
    expect(emf.valuesOf(DEPENDENCY_AVAILABLE)).toEqual([])
  })

  test('publishes 1 tagged dependency redis once ready, and again every minute', async () => {
    client.emit('ready')
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.availabilityOf('redis')).toEqual([
      availabilityPublish('redis', 1),
      availabilityPublish('redis', 1)
    ])
  })

  test('a ready client that closes and then ends publishes 0 once, counts one lost connection, logs each change once and then the stop', async () => {
    client.emit('ready')
    client.emit('close')
    client.emit('end')

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.valuesOf(DEPENDENCY_AVAILABLE)).toEqual([1, 0])
    expect(emf.valuesOf(CONNECTION_LOST)).toEqual([1])
    expect(ecsLog.levelledMessages()).toEqual([
      AVAILABLE_LINE,
      UNAVAILABLE_LINE,
      STOPPED_RECONNECTING_LINE
    ])
  })

  test('a ready client that closes and becomes ready again publishes 1, 0, 1, logs each change and counts one lost connection', async () => {
    client.emit('ready')
    client.emit('close')
    client.emit('ready')

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.valuesOf(DEPENDENCY_AVAILABLE)).toEqual([1, 0, 1])
    expect(emf.valuesOf(CONNECTION_LOST)).toEqual([1])
    expect(ecsLog.levelledMessages()).toEqual([
      AVAILABLE_LINE,
      UNAVAILABLE_LINE,
      AVAILABLE_LINE
    ])
  })

  test('a client that stops reconnecting logs so once at error, tagged dependency redis', () => {
    client.emit('ready')
    client.emit('close')
    client.emit('end')

    expect(
      ecsLog
        .linesWithMessage(STOPPED_RECONNECTING_LINE.message)
        .map((line) => ({
          level: line['log.level'],
          dependency: line.dependency
        }))
    ).toEqual([{ level: 'error', dependency: 'redis' }])
  })

  test('a client that never connected and closes counts no lost connection', async () => {
    client.emit('close')

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.valuesOf(DEPENDENCY_AVAILABLE)).toEqual([0])
    expect(emf.valuesOf(CONNECTION_LOST)).toEqual([])
  })

  test('each client error is logged with its error and counted, tagged dependency redis', async () => {
    client.emit('error', new Error('ECONNREFUSED'))
    client.emit('error', new Error('ECONNREFUSED'))

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.valuesOf(ERROR)).toEqual([1, 1])
    const refusedLine = {
      level: 'error',
      dependency: 'redis',
      error: 'ECONNREFUSED'
    }
    expect(connectionErrorLines()).toEqual([refusedLine, refusedLine])
  })

  test("each error a Cluster client reports from one of its nodes is logged with the node's server address and counted, tagged dependency redis", async () => {
    client.emit('node error', new Error('ECONNREFUSED'), '10.0.0.1:6379')

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.valuesOf(ERROR)).toEqual([1])
    expect(connectionErrorLines()).toEqual([
      {
        level: 'error',
        dependency: 'redis',
        error: 'ECONNREFUSED',
        serverAddress: '10.0.0.1:6379'
      }
    ])
  })
})
