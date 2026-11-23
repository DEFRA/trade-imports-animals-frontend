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
})
