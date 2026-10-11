import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as templates from '../../../../../../services/templates/index.js'
import { formatDisplayMoment } from '../dashboard/notification-helper.js'
import { routes } from './controller.js'

const route = routes.find(
  (candidate) => candidate.method === 'GET' && candidate.path === '/templates'
)
const manageTemplatesGet = route.handler

const request = {
  auth: {
    credentials: {
      contactId: 2100010101,
      sub: 'entra-sub',
      currentRelationshipId: 'stub-org-1'
    }
  },
  query: {},
  params: {}
}

const h = { view: (template, context) => ({ template, context }) }

const saved = (name, created) => ({
  id: name,
  name,
  setId: 'live-animals',
  created
})

describe('GET /templates', () => {
  beforeEach(() => {
    vi.spyOn(templates, 'listFor').mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should register Manage templates under the session strategy', () => {
    expect(route.options.auth).toBe('session')
  })

  it('Should render Manage templates with a zero count and no cards for a user who has saved none', async () => {
    const { template, context } = await manageTemplatesGet(request, h)

    expect(template).toBe(
      'live-animals/journeys/linear/features/templates/template'
    )
    expect(context.pageTitle).toBe('Manage templates')
    expect(context.resultsLabel).toBe('Show 0 of 0 results')
    expect(context.templateCards).toEqual([])
    expect(context).not.toHaveProperty('backLink')
  })

  it("Should ask for the signed-in user's own templates", async () => {
    await manageTemplatesGet(request, h)

    expect(templates.listFor).toHaveBeenCalledWith('2100010101')
  })

  it('Should count and card every template the user has saved, newest first', async () => {
    const newer = saved('Arena Aintree', '2026-02-01T10:00:00Z')
    const older = saved('Acorn Farm', '2026-01-01T10:00:00Z')
    templates.listFor.mockResolvedValue([newer, older])

    const { context } = await manageTemplatesGet(request, h)

    expect(context.resultsLabel).toBe('Show 1-2 of 2 results')
    expect(context.templateCards.map((card) => card.name)).toEqual([
      'Arena Aintree',
      'Acorn Farm'
    ])
    expect(context.templateCards.map((card) => card.created)).toEqual([
      formatDisplayMoment(newer.created),
      formatDisplayMoment(older.created)
    ])
  })

  it('Should let a failed backend list surface as an error', async () => {
    templates.listFor.mockRejectedValue(
      Object.assign(new Error('list templates failed'), {
        name: 'BackendRequestError',
        status: 503
      })
    )

    await expect(manageTemplatesGet(request, h)).rejects.toMatchObject({
      status: 503
    })
  })
})

describe('GET /templates — Create new template', () => {
  beforeEach(() => {
    vi.spyOn(templates, 'listFor').mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should link the button to the type question in template mode', async () => {
    const { context } = await manageTemplatesGet(request, h)

    expect(context.createTemplateHref).toMatch(
      /^https?:\/\/.+\/notification-type\/template$/
    )
  })
})
