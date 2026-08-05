import Hapi from '@hapi/hapi'
import { load } from 'cheerio'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { configureObligationSet } from '../../../../../../model/obligations/manifest.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../shared/kit.js'
import { SESSION_COOKIE_NAMES } from '../../config.js'
import * as plantProductsObligationSet from '../../../../obligations/index.js'
import { toDto } from '../../../../services/records/mapper/to-dto.js'
import { records } from '../../../../services/records/stub.js'
import { placeholderOrganisationOperator } from '../../../../services/placeholder-org.js'
import { copy } from './copy/copy.en.js'

const SET_ID = 'live-animals'

const fixtureObligation = {
  id: '53b27cd5-05b5-40ff-b709-d7444717d71d',
  name: 'fixtureAnswer',
  status: 'mandatory'
}
const fixtureObligationSet = {
  obligations: [fixtureObligation],
  groups: [],
  policy: {
    systemPopulated: [],
    enforcedAtContinue: [],
    maxEntriesFrom: {},
    systemAnswerKeys: ['referenceNumber']
  }
}

const expectedOptions = [
  { value: SET_ID, label: 'Live animals' },
  {
    value: 'poao',
    label: 'Products of animal origin, germinal products or animal by-products'
  },
  {
    value: 'hrfnao',
    label: 'High risk food and feed of non-animal origin'
  },
  { value: 'plants', label: 'Plants, plant products and other objects' }
]

const journeyIdFrom = (url) => url.split('/')[3]

const jar = () => {
  const values = new Map()
  return {
    absorb(response) {
      for (const cookie of response.headers['set-cookie'] ?? []) {
        const [pair] = cookie.split(';')
        const separator = pair.indexOf('=')
        values.set(pair.slice(0, separator), pair.slice(separator + 1))
      }
    },
    header() {
      return [...values.entries()]
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')
    }
  }
}

describe('plant-products import-type controller', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = Hapi.server()
    await server.register(nunjucksConfig)
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
    await server.initialize()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    configureObligationSet('plant-products', plantProductsObligationSet)
    await records.clear()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  const newJourney = async (cookies = jar()) => {
    const response = await server.inject({
      method: 'POST',
      url: '/plant-products/notifications',
      headers: { cookie: cookies.header() }
    })
    cookies.absorb(response)
    return { cookies, url: response.headers.location }
  }

  const postImportType = (url, cookies, importType) =>
    server.inject({
      method: 'POST',
      url,
      payload: { importType },
      headers: { cookie: cookies.header() }
    })

  it('renders exactly four enabled, hint-free options with no client-side validation', async () => {
    const { cookies, url } = await newJourney()
    const response = await server.inject({
      url,
      headers: { cookie: cookies.header() }
    })
    const $ = load(response.result)
    const radios = $('fieldset input[type="radio"]')
    const renderedOptions = radios
      .map((_index, radio) => {
        const input = $(radio)
        const label = $(`label[for="${input.attr('id')}"]`)
        return {
          value: input.attr('value'),
          label: label.text().trim().replaceAll(/\s+/g, ' ')
        }
      })
      .get()

    expect(response.statusCode).toBe(200)
    expect(renderedOptions).toEqual(expectedOptions)
    expect($('fieldset input')).toHaveLength(4)
    expect(radios.filter('[checked]')).toHaveLength(0)
    expect(radios.filter('[disabled]')).toHaveLength(0)
    expect(radios.filter('[required]')).toHaveLength(0)
    expect($('fieldset .govuk-hint')).toHaveLength(0)
    expect($('fieldset').text()).not.toMatch(/debt|debtor|overdue/i)
  })

  it('prefills GET from the saved flow-only answer', async () => {
    const { cookies, url } = await newJourney()
    const post = await postImportType(url, cookies, 'plants')
    cookies.absorb(post)

    const response = await server.inject({
      url,
      headers: { cookie: cookies.header() }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toMatch(/value="plants"[^>]*checked/)
  })

  it('returns 400 with the canonical error and commits nothing for an empty POST', async () => {
    const { cookies, url } = await newJourney()
    const response = await postImportType(url, cookies, '')
    const $ = load(response.result)

    expect(response.statusCode).toBe(400)
    expect($('.govuk-error-summary__title').text().trim()).toBe(
      'There is a problem'
    )
    expect($('.govuk-error-summary__list a').text().trim()).toBe(
      copy.errors.importTypeRequired
    )
    expect($('.govuk-error-summary__list a').attr('href')).toBe('#importType')
    expect($('#importType-error').text()).toContain(
      copy.errors.importTypeRequired
    )
    expect($('input[name="importType"]:checked')).toHaveLength(0)
    expect(response.headers['set-cookie'] ?? []).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SESSION_COOKIE_NAMES.flowOnlyAnswers}=`)
      ])
    )
    await expect(
      records.load({ journeyId: journeyIdFrom(url) })
    ).resolves.toMatchObject({ fulfilment: {} })
  })

  it('rejects a crafted out-of-list POST through the same server-side 400 path', async () => {
    const { cookies, url } = await newJourney()
    const response = await postImportType(url, cookies, 'CHEDPP')

    expect(response.statusCode).toBe(400)
    expect(response.result).toContain(copy.errors.importTypeRequired)
    expect(response.headers['set-cookie'] ?? []).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SESSION_COOKIE_NAMES.flowOnlyAnswers}=`)
      ])
    )
    await expect(
      records.load({ journeyId: journeyIdFrom(url) })
    ).resolves.toMatchObject({ fulfilment: {} })
  })

  it('commits plants only to flow state and redirects to country of origin through the opening run', async () => {
    const { cookies, url } = await newJourney()
    const response = await postImportType(url, cookies, 'plants')
    const stored = await records.load({ journeyId: journeyIdFrom(url) })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/
    )
    expect(response.headers['set-cookie'] ?? []).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SESSION_COOKIE_NAMES.flowOnlyAnswers}=`),
        expect.stringContaining(`${SESSION_COOKIE_NAMES.openingRun}=`)
      ])
    )
    expect({
      canonicalFulfilment: stored.fulfilment,
      backendDocument: toDto(stored.fulfilment)
    }).toEqual({
      canonicalFulfilment: {},
      backendDocument: { importer: placeholderOrganisationOperator() }
    })
  })

  it('uses normal navigation outside an opening run after committed progress', async () => {
    const { cookies, url } = await newJourney()
    const journeyId = journeyIdFrom(url)
    configureObligationSet('plant-products', fixtureObligationSet)
    await records.replaceFulfilment(journeyId, {
      [fixtureObligation.id]: 'yes'
    })
    const nextTarget = vi.spyOn(kit, 'nextTarget')

    const response = await postImportType(url, cookies, 'plants')

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      `/plant-products/notifications/${journeyId}`
    )
    expect(nextTarget).toHaveBeenCalledTimes(1)
    expect(response.headers['set-cookie'] ?? []).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SESSION_COOKIE_NAMES.openingRun}=`)
      ])
    )
    await expect(records.load({ journeyId })).resolves.toMatchObject({
      fulfilment: { [fixtureObligation.id]: 'yes' }
    })
  })

  it.each([SET_ID, 'poao', 'hrfnao'])(
    'commits %s to flow state and redirects to the holding page',
    async (importType) => {
      const { cookies, url } = await newJourney()
      const response = await postImportType(url, cookies, importType)
      cookies.absorb(response)

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toMatch(
        /^\/plant-products\/notifications\/[^/]+\/import-type\/not-available$/
      )
      expect(response.headers['set-cookie'] ?? []).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`${SESSION_COOKIE_NAMES.flowOnlyAnswers}=`)
        ])
      )

      const revisited = await server.inject({
        url,
        headers: { cookie: cookies.header() }
      })
      expect(revisited.result).toMatch(
        new RegExp(`value="${importType}"[^>]*checked`)
      )
    }
  )

  it('renders the holding page with a change-answer link back to import type', async () => {
    const { cookies, url } = await newJourney()
    const post = await postImportType(url, cookies, SET_ID)
    cookies.absorb(post)

    const response = await server.inject({
      url: post.headers.location,
      headers: { cookie: cookies.header() }
    })
    const $ = load(response.result)

    expect(response.statusCode).toBe(200)
    expect($('h1').text().trim()).toBe(copy.notAvailable.title)
    expect(response.result).toContain(copy.notAvailable.onlyCovers)
    expect(response.result).toContain(copy.notAvailable.ifImporting)
    expect(
      $('a')
        .filter((_index, link) =>
          $(link).text().includes(copy.notAvailable.changeAnswer)
        )
        .attr('href')
    ).toBe(url)
  })

  it('renders a recoverable save failure at 500', async () => {
    const { cookies, url } = await newJourney()
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const response = await postImportType(url, cookies, 'plants')

    expect(response.statusCode).toBe(500)
    expect(response.result).toContain('problem with the service')
  })

  it('lets unexpected save errors reach the server catch-all', async () => {
    const { cookies, url } = await newJourney()
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )
    const response = await postImportType(url, cookies, 'plants')

    expect(response.statusCode).toBe(500)
    expect(response.result).not.toContain('problem with the service')
  })
})
