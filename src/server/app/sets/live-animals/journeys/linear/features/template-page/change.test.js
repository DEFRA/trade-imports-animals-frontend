import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as templates from '../../../../../../services/templates/index.js'
import {
  changingSavedTemplate,
  withTemplateMode
} from '../../../../../../shared/template-mode.js'
import { withTemplateChange } from './change.js'

const OWNER = '2100010101'
const ID = '6650f1c2a1b2c3d4e5f60718'
const NAME = 'Weekly cattle'
const TEMPLATE_PAGE = `/live-animals/templates/${ID}`

const h = {
  redirect: (location) => ({ statusCode: 302, headers: { location } })
}

const requestOf = ({ method = 'get', query = {} } = {}) => ({
  auth: { credentials: { contactId: 2100010101 } },
  method,
  params: { journeyId: ID },
  query,
  yar: { set: vi.fn() }
})

const template = (status = 'SAVED') => ({
  id: ID,
  name: NAME,
  setId: 'live-animals',
  status
})

describe('#withTemplateChange', () => {
  let seen
  let handler

  const run = (request, stored = template()) => {
    vi.spyOn(templates, 'getFor').mockResolvedValue(stored)
    return withTemplateMode(OWNER, () =>
      withTemplateChange(handler)(request, h)
    )
  }

  beforeEach(() => {
    seen = []
    handler = vi.fn(async () => {
      seen.push(changingSavedTemplate())
      return { statusCode: 200 }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(['get', 'post'])(
    'Should send a %s for a template the user does not have to Manage templates',
    async (method) => {
      const result = await run(
        requestOf({ method, query: { change: '1' } }),
        null
      )

      expect(result.headers.location).toBe('/live-animals/templates')
      expect(handler).not.toHaveBeenCalled()
    }
  )

  it('Should run the page as a change of a saved template from a Change link', async () => {
    await run(requestOf({ query: { change: '1' } }))

    expect(seen).toEqual([true])
  })

  it('Should not treat a template still being created as a saved change', async () => {
    await run(requestOf({ query: { change: '1' } }), template('IN_PROGRESS'))

    expect(seen).toEqual([false])
  })

  it('Should not treat a page without the change marker as a saved change', async () => {
    await run(requestOf())

    expect(seen).toEqual([false])
  })

  it('Should remember the banner when a save returns to the template page', async () => {
    handler = vi.fn(async () => h.redirect(TEMPLATE_PAGE))
    const request = requestOf({ method: 'post', query: { change: '1' } })

    await run(request)

    expect(request.yar.set).toHaveBeenCalledWith('templateUpdated', {
      name: NAME
    })
  })

  it('Should not remember the banner when the save shows the page again', async () => {
    handler = vi.fn(async () => ({ statusCode: 400 }))
    const request = requestOf({ method: 'post', query: { change: '1' } })

    await run(request)

    expect(request.yar.set).not.toHaveBeenCalled()
  })

  it('Should not remember the banner when a save goes on to another page', async () => {
    handler = vi.fn(async () => h.redirect(`${TEMPLATE_PAGE}/origin`))
    const request = requestOf({ method: 'post', query: { change: '1' } })

    await run(request)

    expect(request.yar.set).not.toHaveBeenCalled()
  })

  it('Should never remember the banner on a GET', async () => {
    handler = vi.fn(async () => h.redirect(TEMPLATE_PAGE))
    const request = requestOf({ query: { change: '1' } })

    await run(request)

    expect(request.yar.set).not.toHaveBeenCalled()
  })
})
