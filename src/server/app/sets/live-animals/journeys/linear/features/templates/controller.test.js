import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  commodityCode,
  consignee,
  consignor,
  countryOfOrigin
} from '../../../../obligations/index.js'
import * as countries from '../../../../../../services/countries/index.js'
import { encodeEvaluatorFulfilments } from '../../../../../../services/persistence/records/fulfilment-codec/index.js'
import * as templates from '../../../../../../services/templates/index.js'
import { routes } from './controller.js'

const route = routes.find(
  (candidate) => candidate.method === 'GET' && candidate.path === '/templates'
)
const manageTemplatesGet = route.handler

const sessionWith = (values = {}) => {
  const held = new Map(Object.entries(values))
  return {
    get: (key) => held.get(key),
    set: (key, value) => held.set(key, value),
    clear: (key) => held.delete(key)
  }
}

const requestWith = (yar) => ({
  auth: {
    credentials: {
      contactId: 2100010101,
      sub: 'entra-sub',
      currentRelationshipId: 'stub-org-1'
    }
  },
  query: {},
  params: {},
  yar
})

let request

const h = { view: (template, context) => ({ template, context }) }

const FEBRUARY = '2026-02-01T10:00:00Z'
const JANUARY = '2026-01-01T10:00:00Z'
const ARENA = 'Arena Aintree'

const saved = (name, created) => ({
  id: name,
  name,
  setId: 'live-animals',
  created,
  fulfilments: []
})

const NOT_APPLICABLE = { text: 'Not applicable' }

describe('GET /templates', () => {
  beforeEach(() => {
    request = requestWith(sessionWith())
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
    const newer = saved(ARENA, FEBRUARY)
    const older = saved('Acorn Farm', JANUARY)
    templates.listFor.mockResolvedValue([newer, older])

    const { context } = await manageTemplatesGet(request, h)

    expect(context.resultsLabel).toBe('Show 1-2 of 2 results')
    expect(context.templateCards.map((card) => card.title)).toEqual([
      ARENA,
      'Acorn Farm'
    ])
  })

  it('Should card each template with its title, its label, its category and its View and Use template targets', async () => {
    templates.listFor.mockResolvedValue([saved(ARENA, FEBRUARY)])

    const { context } = await manageTemplatesGet(request, h)

    expect(context.templateCards).toEqual([
      {
        title: ARENA,
        label: 'Template Arena Aintree',
        category: 'Live animals',
        viewHref: expect.stringMatching(/\/templates\/Arena Aintree$/),
        useAction: expect.stringMatching(/\/templates\/Arena Aintree\/use$/),
        rows: [
          { key: { text: 'Commodity' }, value: NOT_APPLICABLE },
          { key: { text: 'Origin' }, value: NOT_APPLICABLE },
          { key: { text: 'Consignee' }, value: NOT_APPLICABLE },
          { key: { text: 'Consignor' }, value: NOT_APPLICABLE }
        ]
      }
    ])
  })

  it('Should list Commodity, Origin, Consignee and Consignor on each card, in that order', async () => {
    vi.spyOn(countries, 'originDisplayLabel').mockResolvedValue('France')
    templates.listFor.mockResolvedValue([
      {
        ...saved(ARENA, FEBRUARY),
        fulfilments: encodeEvaluatorFulfilments({
          [commodityCode.id]: { l1: 'Cow' },
          [countryOfOrigin.id]: 'FR',
          [consignee.id]: { name: 'British Livestock Ltd' },
          [consignor.id]: { name: 'Astra Rosales' }
        })
      }
    ])

    const { context } = await manageTemplatesGet(request, h)

    const { rows } = context.templateCards[0]
    expect(rows.map((row) => row.key.text)).toEqual([
      'Commodity',
      'Origin',
      'Consignee',
      'Consignor'
    ])
    expect(rows.map((row) => row.value.text)).toEqual([
      'Cow',
      'France',
      'British Livestock Ltd',
      'Astra Rosales'
    ])
  })

  it('Should title a template saved with no name Untitled template', async () => {
    templates.listFor.mockResolvedValue([
      saved('', FEBRUARY),
      saved('  ', JANUARY)
    ])

    const { context } = await manageTemplatesGet(request, h)

    expect(context.templateCards.map((card) => card.title)).toEqual([
      'Untitled template',
      'Untitled template'
    ])
    expect(context.templateCards[0].label).toBe('Template Untitled template')
  })

  it("Should show the saved banner once, headed with the template's title", async () => {
    request = requestWith(
      sessionWith({ templateSaved: { name: 'Weekly cattle' } })
    )

    const first = await manageTemplatesGet(request, h)
    const second = await manageTemplatesGet(request, h)

    expect(first.context.savedBanner.heading).toBe(
      'Weekly cattle saved to templates'
    )
    expect(second.context.savedBanner).toBeNull()
  })

  it('Should head the banner Untitled template saved to templates for a template saved with no name', async () => {
    request = requestWith(sessionWith({ templateSaved: { name: '' } }))

    const { context } = await manageTemplatesGet(request, h)

    expect(context.savedBanner.heading).toBe(
      'Untitled template saved to templates'
    )
  })

  it('Should show no banner when nothing was just saved', async () => {
    const { context } = await manageTemplatesGet(request, h)

    expect(context.savedBanner).toBeNull()
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

  it('Should keep the saved banner for the next visit when the list fails', async () => {
    const justSaved = { name: 'Monthly sheep' }
    const failure = new Error('list templates failed')
    const yar = sessionWith({ templateSaved: justSaved })
    request = requestWith(yar)
    templates.listFor.mockRejectedValue(failure)

    await expect(manageTemplatesGet(request, h)).rejects.toBe(failure)

    expect(yar.get('templateSaved')).toBe(justSaved)
  })
})

describe('GET /templates — Create new template', () => {
  beforeEach(() => {
    request = requestWith(sessionWith())
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
