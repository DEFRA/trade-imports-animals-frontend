import { describe, expect, it } from 'vitest'

import {
  changingSavedTemplate,
  inTemplateMode,
  templateModeRoutes,
  templateOwnerId,
  withSavedTemplateChange,
  withTemplateMode
} from './template-mode.js'

const OWNER = '2100010101'
const OVERVIEW_ROUTE = '/notifications/{journeyId}'
const ORIGIN_ROUTE = '/notifications/{journeyId}/origin'

const credentials = { contactId: 2100010101 }

const route = (method, path, handler = () => 'original') => ({
  method,
  path,
  options: { auth: 'session' },
  handler
})

describe('#inTemplateMode', () => {
  it('Should be false outside template mode', () => {
    expect(inTemplateMode()).toBe(false)
    expect(templateOwnerId()).toBeUndefined()
  })

  it('Should be true inside template mode, carrying the owner', () => {
    withTemplateMode(OWNER, () => {
      expect(inTemplateMode()).toBe(true)
      expect(templateOwnerId()).toBe(OWNER)
    })
  })

  it('Should be true across an await inside template mode', async () => {
    await withTemplateMode(OWNER, async () => {
      await Promise.resolve()
      expect(inTemplateMode()).toBe(true)
    })
    expect(inTemplateMode()).toBe(false)
  })
})

describe('#templateModeRoutes', () => {
  it('Should twin a notification route under /templates with the same method and options', () => {
    const [twin] = templateModeRoutes([route('POST', ORIGIN_ROUTE)])

    expect(twin.method).toBe('POST')
    expect(twin.path).toBe('/templates/{journeyId}/origin')
    expect(twin.options).toEqual({ auth: 'session' })
  })

  it('Should run the twin handler in template mode for the signed-in user', async () => {
    const observed = []
    const original = () => {
      observed.push([inTemplateMode(), templateOwnerId()])
      return 'done'
    }
    const [twin] = templateModeRoutes([route('GET', ORIGIN_ROUTE, original)])

    const result = await twin.handler({ auth: { credentials } }, {})

    expect(result).toBe('done')
    expect(observed).toEqual([[true, OWNER]])
    expect(inTemplateMode()).toBe(false)
  })

  it('Should leave the original route running in notification mode', () => {
    const observed = []
    const original = route('GET', ORIGIN_ROUTE, () =>
      observed.push(inTemplateMode())
    )

    original.handler({}, {})

    expect(observed).toEqual([false])
  })

  it('Should wrap a handler held in the route options as well', async () => {
    const observed = []
    const [twin] = templateModeRoutes([
      {
        method: 'GET',
        path: ORIGIN_ROUTE,
        options: {
          handler: () => observed.push(inTemplateMode())
        }
      }
    ])

    await twin.options.handler({ auth: { credentials } }, {})

    expect(observed).toEqual([true])
  })

  it("Should twin the overview path as the template's task list", async () => {
    const observed = []
    const [twin, ...rest] = templateModeRoutes([
      route('GET', OVERVIEW_ROUTE, () => observed.push(inTemplateMode()))
    ])

    await twin.handler({ auth: { credentials } }, {})

    expect(rest).toEqual([])
    expect(twin.path).toBe('/templates/{journeyId}')
    expect(twin.method).toBe('GET')
    expect(twin.options).toEqual({ auth: 'session' })
    expect(observed).toEqual([true])
  })

  it('Should wrap the overview twin alone with the overview option, inside template mode', async () => {
    const observed = []
    const overview = (handler) => (request, h) => {
      observed.push({ decorated: true, inTemplateMode: inTemplateMode() })
      return handler(request, h)
    }
    const [overviewTwin, originTwin] = templateModeRoutes(
      [
        route('GET', OVERVIEW_ROUTE, () => 'task list'),
        route('GET', ORIGIN_ROUTE, () => 'origin')
      ],
      { overview }
    )

    const overviewResult = await overviewTwin.handler(
      { auth: { credentials } },
      {}
    )
    const originResult = await originTwin.handler({ auth: { credentials } }, {})

    expect(overviewResult).toBe('task list')
    expect(originResult).toBe('origin')
    expect(observed).toEqual([{ decorated: true, inTemplateMode: true }])
  })

  it('Should leave routes outside the journey alone', () => {
    expect(
      templateModeRoutes([
        route('GET', '/templates'),
        route('GET', '/'),
        route('POST', '/notifications')
      ])
    ).toEqual([])
  })

  it('Should skip an excluded slug and everything under it', () => {
    const twins = templateModeRoutes(
      [
        route('GET', '/notifications/{journeyId}/accompanying-documents'),
        route(
          'GET',
          '/notifications/{journeyId}/accompanying-documents/status'
        ),
        route('GET', ORIGIN_ROUTE)
      ],
      { excludedSlugs: ['accompanying-documents'] }
    )

    expect(twins.map((twin) => twin.path)).toEqual([
      '/templates/{journeyId}/origin'
    ])
  })

  it('Should not mistake a longer slug for an excluded one', () => {
    const twins = templateModeRoutes(
      [route('GET', '/notifications/{journeyId}/copy-details')],
      { excludedSlugs: ['copy'] }
    )

    expect(twins.map((twin) => twin.path)).toEqual([
      '/templates/{journeyId}/copy-details'
    ])
  })

  it('Should wrap every journey page twin with the page option, not the overview, inside template mode', async () => {
    const decorated = []
    const page = (handler) => (request, h) => {
      decorated.push(inTemplateMode())
      return handler(request, h)
    }
    const [overviewTwin, originTwin] = templateModeRoutes(
      [
        route('GET', OVERVIEW_ROUTE, () => 'task list'),
        route('POST', ORIGIN_ROUTE, () => 'origin')
      ],
      { page }
    )

    await overviewTwin.handler({ auth: { credentials } }, {})
    expect(decorated).toEqual([])
    const result = await originTwin.handler({ auth: { credentials } }, {})

    expect(result).toBe('origin')
    expect(decorated).toEqual([true])
  })
})

describe('#changingSavedTemplate', () => {
  it('Should be false outside the saved-change context and inside plain template mode', () => {
    expect(changingSavedTemplate()).toBe(false)
    withTemplateMode(OWNER, () => {
      expect(changingSavedTemplate()).toBe(false)
    })
  })

  it('Should be true inside withSavedTemplateChange, keeping the owner and template mode', async () => {
    await withTemplateMode(OWNER, () =>
      withSavedTemplateChange(async () => {
        await Promise.resolve()
        expect(changingSavedTemplate()).toBe(true)
        expect(inTemplateMode()).toBe(true)
        expect(templateOwnerId()).toBe(OWNER)
      })
    )
    expect(changingSavedTemplate()).toBe(false)
  })
})
