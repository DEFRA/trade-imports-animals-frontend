import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startStubModeServer } from '../../common/test-helpers/stub-mode-server.js'
import { LEVELS, TAG_CLASSES } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'
import { isInSection } from './page-maturity.js'

let server
let stopServer

beforeAll(async () => {
  ;({ server, stop: stopServer } = await startStubModeServer())
})

afterAll(async () => {
  await stopServer()
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

  it('Should list only sections that hold at least one registered GET route', () => {
    const registered = [...registeredGetPaths()]

    for (const { section } of SECTION_LEVELS) {
      expect(
        registered.some((routePath) => isInSection(routePath, section)),
        `${section} holds no route`
      ).toBe(true)
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
