import { createLogger } from './logger.js'
import { recordEcsLogLines } from '../../test-helpers/ecs-log-lines.js'

describe('createLogger', () => {
  const ecsLog = recordEcsLogLines()

  test('writes a fatal line from a child logger in ECS, with the child bindings', () => {
    createLogger().child({ dependency: 'redis' }).fatal('Redis unreachable')

    expect(ecsLog.lines()).toEqual([
      expect.objectContaining({
        'log.level': 'fatal',
        message: 'Redis unreachable',
        dependency: 'redis'
      })
    ])
  })

  test('writes an err as the ECS error with its type, message, own code and stack trace', () => {
    const err = Object.assign(new Error('token stale'), {
      code: 'STALE_CONCURRENCY_TOKEN'
    })

    createLogger().warn({ err }, 'Save refused')

    expect(ecsLog.lines()[0].error).toEqual({
      type: 'Error',
      message: 'token stale',
      code: 'STALE_CONCURRENCY_TOKEN',
      stack_trace: expect.stringMatching(/^Error: token stale\n/)
    })
  })

  test('writes a field named error that is not an err as it was given', () => {
    createLogger().warn({ error: { reason: 'quota' } }, 'Refused')

    expect(ecsLog.lines()[0].error).toEqual({ reason: 'quota' })
  })
})
