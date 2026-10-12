import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as state from '../../../../../../engine/index.js'
import * as templates from '../../../../../../services/templates/index.js'
import { withTemplateMode } from '../../../../../../shared/template-mode.js'
import { buildSections } from '../check-answers/view-model/index.js'
import { withTemplatePage } from './controller.js'

vi.mock('../check-answers/view-model/index.js', () => ({
  buildSections: vi.fn(async () => [])
}))

const OWNER = '2100010101'
const ID = '6650f1c2a1b2c3d4e5f60718'
const NAME = 'Weekly cattle'
const SAVED_DAY = '2026-09-10T23:35:39.455Z'
const CREATED_DAY = '2026-01-05T10:00:00Z'
const ORIGIN_FARM = 'Origin Farm'

const sessionStore = new Map()

const request = {
  auth: { credentials: { contactId: 2100010101 } },
  params: { journeyId: ID },
  query: {},
  yar: {
    get: (key) => sessionStore.get(key),
    set: (key, value) => sessionStore.set(key, value),
    clear: (key) => sessionStore.delete(key)
  }
}

const h = {
  view: (template, context) => ({ template, context }),
  redirect: (location) => ({ redirected: location })
}

const savedTemplate = (overrides = {}) => ({
  id: ID,
  name: NAME,
  setId: 'live-animals',
  created: CREATED_DAY,
  saved: SAVED_DAY,
  status: 'SAVED',
  ...overrides
})

describe('the template page', () => {
  let taskList

  const open = (template) => {
    vi.spyOn(templates, 'getFor').mockResolvedValue(template)
    return withTemplateMode(OWNER, () => withTemplatePage(taskList)(request, h))
  }

  beforeEach(() => {
    sessionStore.clear()
    vi.mocked(buildSections).mockClear()
    taskList = vi.fn(async () => 'task list')
    vi.spyOn(state, 'get').mockResolvedValue({
      journey: { journeyId: ID },
      answers: {},
      scope: {},
      evaluation: {}
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should send a missing template to Manage templates', async () => {
    const result = await open(undefined)

    expect(result).toEqual({ redirected: '/live-animals/templates' })
    expect(taskList).not.toHaveBeenCalled()
  })

  it('Should hand a template still being created to the task list', async () => {
    const result = await open(savedTemplate({ status: 'IN_PROGRESS' }))

    expect(result).toBe('task list')
  })

  it('Should render a saved template titled with its name under the Templates caption, with its Back link to Manage templates', async () => {
    const { template, context } = await open(savedTemplate())

    expect(template).toBe(
      'live-animals/journeys/linear/features/template-page/template'
    )
    expect(context.pageTitle).toBe(NAME)
    expect(context.heading).toBe(NAME)
    expect(context.copy.caption).toBe('Templates')
    expect(context.backLink).toBe('/live-animals/templates')
    expect(taskList).not.toHaveBeenCalled()
  })

  it('Should date the template by the day it was first saved, falling back to the day it was created', async () => {
    const first = await open(savedTemplate())
    const legacy = await open(savedTemplate({ saved: null }))

    expect(first.context.dateCreated).toBe('Date created: 11 September 2026')
    expect(legacy.context.dateCreated).toBe('Date created: 5 January 2026')
  })

  it('Should offer Use template and Delete targets under the template', async () => {
    const { context } = await open(savedTemplate())

    expect(context.useAction).toBe(`/live-animals/templates/${ID}/use`)
    expect(context.deleteHref).toBe(`/live-animals/templates/${ID}/delete`)
  })

  it('Should show no banner when nothing was remembered', async () => {
    const { context } = await open(savedTemplate())

    expect(context.updatedBanner).toBeNull()
  })

  it('Should confirm a changed template by name, once', async () => {
    sessionStore.set('templateUpdated', { name: NAME })

    const first = await open(savedTemplate())
    const reloaded = await open(savedTemplate())

    expect(first.context.updatedBanner).toEqual({
      heading: `${NAME} has been updated`
    })
    expect(reloaded.context.updatedBanner).toBeNull()
  })

  it('Should confirm a changed template with no name as Template has been updated', async () => {
    sessionStore.set('templateUpdated', { name: '' })

    const { context } = await open(savedTemplate({ name: '' }))

    expect(context.updatedBanner).toEqual({
      heading: 'Template has been updated'
    })
  })

  it('Should show the place of origin as the contact address when none was chosen', async () => {
    state.get.mockResolvedValue({
      journey: { journeyId: ID },
      answers: {
        placeOfOrigin: {
          name: ORIGIN_FARM,
          address: { addressLine1: '1 Farm Lane', countryCode: 'GB' }
        }
      },
      scope: {},
      evaluation: {}
    })

    await open(savedTemplate())

    expect(buildSections.mock.lastCall[5].contactAddress.name).toBe(ORIGIN_FARM)
  })

  it('Should show the chosen contact address when there is one', async () => {
    state.get.mockResolvedValue({
      journey: { journeyId: ID },
      answers: {
        placeOfOrigin: {
          name: ORIGIN_FARM,
          address: { addressLine1: '1 Farm Lane', countryCode: 'GB' }
        },
        contactAddress: {
          name: 'Animal and Plant Health Agency',
          address: { countryCode: 'GB' }
        }
      },
      scope: {},
      evaluation: {}
    })

    await open(savedTemplate())

    expect(buildSections.mock.lastCall[5].contactAddress.name).toBe(
      'Animal and Plant Health Agency'
    )
  })

  it('Should title a template saved with no name Untitled template', async () => {
    const { context } = await open(savedTemplate({ name: '' }))

    expect(context.pageTitle).toBe('Untitled template')
    expect(context.heading).toBe('Untitled template')
  })
})
