import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BASE, FLOW_ID, hubShape, LAYOUT, TEMPLATES } from './config.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flow = JSON.parse(
  fs.readFileSync(path.join(dirname, '..', 'model', 'flow.json'), 'utf8')
)

const sectionById = (id) => flow.sections.find((section) => section.id === id)
const childPages = (group) =>
  (group.children ?? []).filter((child) => child.kind === 'page')
const childGroups = (group) =>
  (group.children ?? []).filter((child) => child.kind === 'group')

const ALWAYS_LIVE_GROUP_COUNT = 3

describe('journey/config — shell identity', () => {
  it('mounts under the standalone tree on the shared journey path', () => {
    expect(BASE).toBe(
      '/prototype-standalone/obligations-standalone-spike/task-list-with-linear-tasks'
    )
  })

  it('roots layout and templates inside this spike', () => {
    expect(TEMPLATES).toBe('standalone/obligations-standalone-spike/templates')
    expect(LAYOUT).toBe(`${TEMPLATES}/layout.njk`)
  })

  it('stamps journeys with the Flow id', () => {
    expect(FLOW_ID).toBe(flow.id)
  })
})

describe('journey/config — hubShape alignment with flow.json', () => {
  it('lists the three always-live groups in Flow order with their pages', () => {
    expect(hubShape.groups.map((group) => group.sectionId)).toEqual(
      flow.sections
        .slice(0, ALWAYS_LIVE_GROUP_COUNT)
        .map((section) => section.id)
    )
    for (const group of hubShape.groups) {
      const section = sectionById(group.sectionId)
      expect(section, group.sectionId).toBeDefined()
      expect(group.pageIds).toEqual(childPages(section).map((page) => page.id))
    }
  })

  it('names the add-on fan-out section, its picker page and its sub-groups', () => {
    const section = sectionById(hubShape.addons.sectionId)
    expect(childPages(section).map((page) => page.id)).toEqual([
      hubShape.addons.selectionPageId
    ])
    expect(childGroups(section).map((group) => group.id)).toEqual(
      hubShape.addons.addonSectionIds
    )
  })

  it('names the gated quote section and its one page', () => {
    const section = sectionById(hubShape.quote.sectionId)
    expect(childPages(section).map((page) => page.id)).toEqual([
      hubShape.quote.pageId
    ])
  })

  it('is a frozen literal, all the way down', () => {
    expect(Object.isFrozen(hubShape)).toBe(true)
    expect(Object.isFrozen(hubShape.groups)).toBe(true)
    expect(Object.isFrozen(hubShape.groups[0].pageIds)).toBe(true)
    expect(Object.isFrozen(hubShape.addons.addonSectionIds)).toBe(true)
  })
})
