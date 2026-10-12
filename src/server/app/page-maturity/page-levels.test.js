import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { createServer } from '../../server.js'
import { LEVELS, TAG_CLASSES } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'

const originalStubMode = config.get('stubMode')
let server

beforeAll(async () => {
  config.set('stubMode', true)
  server = await createServer()
  await server.initialize()
})

afterAll(async () => {
  config.set('stubMode', originalStubMode)
  await server.stop({ timeout: 0 })
})

const registeredGetPaths = () =>
  new Set(
    server
      .table()
      .filter((route) => route.method === 'get')
      .map((route) => route.path)
  )

describe('page maturity page levels', () => {
  it('Should list only GET routes the server really registers', () => {
    const registered = registeredGetPaths()

    for (const routePath of Object.keys(PAGE_LEVELS)) {
      expect(registered.has(routePath), `${routePath} is not a route`).toBe(
        true
      )
    }
  })

  it('Should list only sections the server really registers', () => {
    const registered = registeredGetPaths()

    for (const { section } of SECTION_LEVELS) {
      expect(registered.has(section), `${section} is not a route`).toBe(true)
    }
  })

  it('Should give every page and section a known level', () => {
    const levels = [
      ...Object.values(PAGE_LEVELS),
      ...SECTION_LEVELS.map(({ level }) => level)
    ]

    for (const level of levels) {
      expect(Object.values(LEVELS)).toContain(level)
      expect(TAG_CLASSES).toHaveProperty(level)
    }
  })
})
