import { SET_ID } from '../../../../set.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { config } from '../../../../../../../../config/config.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import * as templates from '../../../../../../services/templates/index.js'
import { stubH } from '../../../../../../engine/test-support.js'
import { routes } from './controller.js'

const OWNER = '2100010101'
const TEMPLATE_ID = 'template-1'
const LIVE_ANIMALS = 'live-animals'
const GERMINAL_PRODUCTS = 'germinal-products'
const WEEKLY_CATTLE = 'Weekly cattle'
const TEMPLATES_LIST = '/live-animals/templates'
const FRONT_DOOR = config
  .get('tradeImportsInsFrontend.baseUrl')
  .replace(/\/$/, '')
const TYPE_QUESTION = `${FRONT_DOOR}/notification-type/template`

const handlerFor = (method, path) =>
  routes.find((route) => route.method === method && route.path === path).handler

const newGet = handlerFor('GET', '/templates/new')
const newPost = handlerFor('POST', '/templates/new')
const nameGet = handlerFor('GET', '/templates/{journeyId}/name')
const namePost = handlerFor('POST', '/templates/{journeyId}/name')

const request = (overrides = {}) => ({
  auth: {
    isAuthenticated: true,
    credentials: {
      contactId: 2100010101,
      currentRelationshipId: '5900001'
    }
  },
  payload: {},
  query: {},
  params: {},
  state: {},
  ...overrides
})

// The shared stub view has no `header`, which this page sets to stop the
// browser caching the name.
const withHeaders = (h) => {
  const view = h.view
  h.view = (...args) => {
    const rendered = view(...args)
    rendered.header = vi.fn(() => rendered)
    return rendered
  }
  return h
}

const render = async (handler, requestOverrides) => {
  const h = withHeaders(stubH())
  const response = await handler(request(requestOverrides), h)
  return { context: h.captured.view?.context, response, h }
}

const storedTemplate = (overrides = {}) => ({
  id: TEMPLATE_ID,
  name: WEEKLY_CATTLE,
  setId: LIVE_ANIMALS,
  ...overrides
})

describe('template name page', () => {
  beforeAll(() => {
    configureSession(SET_ID, sessionStub)
  })

  beforeEach(() => {
    vi.spyOn(templates, 'startFor').mockResolvedValue(storedTemplate())
    vi.spyOn(templates, 'getFor').mockResolvedValue(storedTemplate())
    vi.spyOn(templates, 'updateDetailsFor').mockResolvedValue(storedTemplate())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should register every route under the session strategy', () => {
    for (const route of routes) {
      expect(route.options.auth).toBe('session')
    }
  })

  describe('GET /templates/new', () => {
    it('Should show an empty name page headed Enter template name', async () => {
      const { context } = await render(newGet, {
        query: { type: LIVE_ANIMALS }
      })

      expect(context.pageTitle).toBe('Enter template name')
      expect(context.copy.caption).toBe('Create a new template')
      expect(context.templateName).toBe('')
      expect(context.cancelHref).toBe(TEMPLATES_LIST)
      expect(context.journeyStrip).toBeNull()
    })

    it('Should send Back to the type question with the chosen type', async () => {
      const { context } = await render(newGet, {
        query: { type: LIVE_ANIMALS }
      })

      expect(context.backLink).toBe(`${TYPE_QUESTION}?type=live-animals`)
      expect(context.notificationType).toBe(LIVE_ANIMALS)
    })

    it('Should send Back to Manage templates when no type has been chosen', async () => {
      const { context } = await render(newGet)

      expect(context.backLink).toBe(TEMPLATES_LIST)
      expect(context.notificationType).toBeUndefined()
    })

    it('Should ignore a type a template cannot have', async () => {
      const { context } = await render(newGet, {
        query: { type: 'plants-for-planting' }
      })

      expect(context.backLink).toBe(TEMPLATES_LIST)
    })

    it('Should not store anything', async () => {
      await render(newGet, { query: { type: LIVE_ANIMALS } })

      expect(templates.startFor).not.toHaveBeenCalled()
    })
  })

  describe('GET /templates/{journeyId}/name', () => {
    it('Should show the name already entered and carry the template back to the type question', async () => {
      const { context } = await render(nameGet, {
        params: { journeyId: TEMPLATE_ID }
      })

      expect(templates.getFor).toHaveBeenCalledWith(OWNER, TEMPLATE_ID)
      expect(context.templateName).toBe(WEEKLY_CATTLE)
      expect(context.backLink).toBe(
        `${TYPE_QUESTION}?type=live-animals&template=${TEMPLATE_ID}`
      )
    })

    it('Should carry a germinal products choice back to the type question', async () => {
      const { context } = await render(nameGet, {
        params: { journeyId: TEMPLATE_ID },
        query: { type: GERMINAL_PRODUCTS }
      })

      expect(context.backLink).toBe(
        `${TYPE_QUESTION}?type=${GERMINAL_PRODUCTS}&template=${TEMPLATE_ID}`
      )
      expect(context.notificationType).toBe(GERMINAL_PRODUCTS)
    })

    it('Should send an unknown template back to Manage templates', async () => {
      templates.getFor.mockResolvedValue(undefined)

      const { response } = await render(nameGet, {
        params: { journeyId: 'nope' }
      })

      expect(response).toEqual({ redirect: TEMPLATES_LIST })
    })
  })

  describe('POST /templates/new', () => {
    it('Should store the trimmed name with the chosen type, begin the run and go to origin', async () => {
      const { response, h } = await render(newPost, {
        payload: {
          templateName: '  Weekly cattle  ',
          notificationType: LIVE_ANIMALS
        }
      })

      expect(templates.startFor).toHaveBeenCalledWith(OWNER, {
        setId: LIVE_ANIMALS,
        name: WEEKLY_CATTLE,
        organisationId: '5900001'
      })
      expect(response).toEqual({
        redirect: `/live-animals/templates/${TEMPLATE_ID}/origin`
      })
      expect(Object.keys(h.cookies).join()).toContain('openingRun')
    })

    it('Should accept a blank name', async () => {
      const { response } = await render(newPost, {
        payload: { templateName: '   ', notificationType: LIVE_ANIMALS }
      })

      expect(templates.startFor).toHaveBeenCalledWith(
        OWNER,
        expect.objectContaining({ name: '' })
      )
      expect(response.redirect).toContain('/origin')
    })

    it('Should store a live animals template when no valid type was carried', async () => {
      await render(newPost, { payload: { templateName: 'x' } })

      expect(templates.startFor).toHaveBeenCalledWith(
        OWNER,
        expect.objectContaining({ setId: LIVE_ANIMALS })
      )
    })

    it('Should store nothing and return to Manage templates for germinal products', async () => {
      const { response } = await render(newPost, {
        payload: {
          templateName: 'Semen',
          notificationType: GERMINAL_PRODUCTS
        }
      })

      expect(templates.startFor).not.toHaveBeenCalled()
      expect(response).toEqual({ redirect: TEMPLATES_LIST })
    })
  })

  describe('POST /templates/{journeyId}/name', () => {
    it('Should update the type and trimmed name and go to origin', async () => {
      const { response } = await render(namePost, {
        params: { journeyId: TEMPLATE_ID },
        payload: {
          templateName: ' Renamed ',
          notificationType: LIVE_ANIMALS
        }
      })

      expect(templates.updateDetailsFor).toHaveBeenCalledWith(
        OWNER,
        TEMPLATE_ID,
        { setId: LIVE_ANIMALS, name: 'Renamed' }
      )
      expect(response).toEqual({
        redirect: `/live-animals/templates/${TEMPLATE_ID}/origin`
      })
    })

    it('Should keep the stored type and go to origin when no type was carried', async () => {
      const { response } = await render(namePost, {
        params: { journeyId: TEMPLATE_ID },
        payload: { templateName: ' Renamed ' }
      })

      expect(templates.updateDetailsFor).toHaveBeenCalledWith(
        OWNER,
        TEMPLATE_ID,
        { setId: LIVE_ANIMALS, name: 'Renamed' }
      )
      expect(response).toEqual({
        redirect: `/live-animals/templates/${TEMPLATE_ID}/origin`
      })
    })

    it('Should send an unknown template back to Manage templates', async () => {
      templates.getFor.mockResolvedValue(undefined)

      const { response } = await render(namePost, {
        params: { journeyId: 'nope' },
        payload: { templateName: 'x' }
      })

      expect(templates.updateDetailsFor).not.toHaveBeenCalled()
      expect(response).toEqual({ redirect: TEMPLATES_LIST })
    })

    it('Should change nothing and return to Manage templates for germinal products', async () => {
      const { response } = await render(namePost, {
        params: { journeyId: TEMPLATE_ID },
        payload: { templateName: 'x', notificationType: GERMINAL_PRODUCTS }
      })

      expect(templates.updateDetailsFor).not.toHaveBeenCalled()
      expect(response).toEqual({ redirect: TEMPLATES_LIST })
    })
  })
})
