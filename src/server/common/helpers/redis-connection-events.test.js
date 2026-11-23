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
      error: line.error?.message,
      serverAddress: line.server?.address
    }))

describe('reportRedisConnectionEvents', () => {
  const ecsLog = recordEcsLogLines()
  const emf = recordEmfDocuments()
  let client

  const eventually = (assertion) => vi.waitFor(assertion)

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

    await eventually(() => expect(emf.valuesOf(ERROR)).toEqual([1]))
    expect(emf.valuesOf(DEPENDENCY_AVAILABLE)).toEqual([])
  })

  test('publishes 1 tagged dependency redis once ready, and again every minute', async () => {
    client.emit('ready')
    vi.advanceTimersByTime(ONE_MINUTE_MS)

    await eventually(() =>
      expect(emf.availabilityOf('redis')).toEqual([
        availabilityPublish('redis', 1),
        availabilityPublish('redis', 1)
      ])
    )
  })

  test('a ready client that closes and then ends publishes 0 once, counts one lost connection and logs each change once', async () => {
    client.emit('ready')
    client.emit('close')
    client.emit('end')

    await eventually(() => {
      expect(emf.valuesOf(DEPENDENCY_AVAILABLE)).toEqual([1, 0])
      expect(emf.valuesOf(CONNECTION_LOST)).toEqual([1])
    })
    expect(availabilityLines(ecsLog.lines())).toEqual([
      AVAILABLE_LINE,
      UNAVAILABLE_LINE
    ])
  })

  test('a ready client that closes and becomes ready again publishes 1, 0, 1, logs each change and counts one lost connection', async () => {
    client.emit('ready')
    client.emit('close')
    client.emit('ready')

    await eventually(() => {
      expect(emf.valuesOf(DEPENDENCY_AVAILABLE)).toEqual([1, 0, 1])
      expect(emf.valuesOf(CONNECTION_LOST)).toEqual([1])
    })
    expect(availabilityLines(ecsLog.lines())).toEqual([
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
        .lines()
        .filter((line) => line.message === 'Redis client stopped reconnecting')
        .map((line) => ({
          level: line['log.level'],
          dependency: line.dependency
        }))
    ).toEqual([{ level: 'error', dependency: 'redis' }])
  })

  test('a client that never connected and closes counts no lost connection', async () => {
    client.emit('close')

    await eventually(() =>
      expect(emf.valuesOf(DEPENDENCY_AVAILABLE)).toEqual([0])
    )
    expect(emf.valuesOf(CONNECTION_LOST)).toEqual([])
  })

  test('each client error is logged with its error and counted, tagged dependency redis', async () => {
    client.emit('error', new Error('ECONNREFUSED'))
    client.emit('error', new Error('ECONNREFUSED'))

    await eventually(() => expect(emf.valuesOf(ERROR)).toEqual([1, 1]))
    const refusedLine = {
      level: 'error',
      dependency: 'redis',
      error: 'ECONNREFUSED'
    }
    expect(errorLines(ecsLog.lines())).toEqual([refusedLine, refusedLine])
  })

  test("each error a Cluster client reports from one of its nodes is logged with the node's server address and counted, tagged dependency redis", async () => {
    client.emit('node error', new Error('ECONNREFUSED'), '10.0.0.1:6379')

    await eventually(() => expect(emf.valuesOf(ERROR)).toEqual([1]))
    expect(errorLines(ecsLog.lines())).toEqual([
      {
        level: 'error',
        dependency: 'redis',
        error: 'ECONNREFUSED',
        serverAddress: '10.0.0.1:6379'
      }
    ])
  })
})
