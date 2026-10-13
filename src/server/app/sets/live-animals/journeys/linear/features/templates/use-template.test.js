import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as journey from '../../../../../../engine/journey.js'
import * as runState from '../../../../../../flow/run-state.js'
import * as templates from '../../../../../../services/templates/index.js'
import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { animalsCertifiedFor } from '../../../../obligations/index.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from '../../../../../../services/persistence/records/fulfilment-codec/index.js'
import { routes } from './controller.js'
import { notificationSeedFrom } from './seed-notification.js'

const route = routes.find(
  (candidate) =>
    candidate.method === 'POST' &&
    candidate.path === '/templates/{journeyId}/use'
)
const useTemplatePost = route.handler

const TEMPLATE_ID = 'template-1'
const NEW_REFERENCE = 'GBN-AG-26-ABC123'

const savedTemplate = (overrides = {}) => ({
  id: TEMPLATE_ID,
  name: 'Weekly cattle',
  setId: 'live-animals',
  status: 'SAVED',
  fulfilments: encodeEvaluatorFulfilments(
    assembleFulfilments({
      countryOfOrigin: 'FR',
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfAnimalsQuantity: '5',
          numberOfPackages: '2'
        }
      ]
    })
  ),
  ...overrides
})

const request = {
  auth: {
    credentials: {
      contactId: 2100010101,
      sub: 'entra-sub',
      currentRelationshipId: 'stub-org-1'
    }
  },
  params: { journeyId: TEMPLATE_ID }
}

const h = { redirect: (location) => ({ redirectedTo: location }) }

describe('POST /templates/{journeyId}/use', () => {
  beforeEach(() => {
    vi.spyOn(templates, 'getFor').mockResolvedValue(savedTemplate())
    vi.spyOn(journey, 'startJourney').mockResolvedValue({
      journeyId: NEW_REFERENCE
    })
    vi.spyOn(runState, 'beginOpeningRun').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should register the route under the session strategy', () => {
    expect(route.options.auth).toBe('session')
  })

  it("Should ask for the signed-in user's own template", async () => {
    await useTemplatePost(request, h)

    expect(templates.getFor).toHaveBeenCalledWith('2100010101', TEMPLATE_ID)
  })

  it('Should start a draft seeded from the template and open its task list', async () => {
    const result = await useTemplatePost(request, h)

    const decoded = decodePersistedFulfilment(savedTemplate().fulfilments)
    expect(journey.startJourney).toHaveBeenCalledWith(request, h, {
      fulfilment: notificationSeedFrom(decoded)
    })
    expect(
      journey.startJourney.mock.calls[0][2].fulfilment[animalsCertifiedFor.id]
    ).toBe('further-keeping')
    expect(runState.beginOpeningRun).toHaveBeenCalledWith(
      request,
      h,
      NEW_REFERENCE
    )
    expect(result.redirectedTo).toBe(
      `/live-animals/notifications/${NEW_REFERENCE}`
    )
  })

  it.each([
    ['missing, deleted or another user’s', undefined],
    ['still being created', savedTemplate({ status: 'IN_PROGRESS' })],
    ['from another set', savedTemplate({ setId: 'germinal-products' })]
  ])(
    'Should open Manage templates and start nothing for a template that is %s',
    async (_case, template) => {
      templates.getFor.mockResolvedValue(template)

      const result = await useTemplatePost(request, h)

      expect(journey.startJourney).not.toHaveBeenCalled()
      expect(runState.beginOpeningRun).not.toHaveBeenCalled()
      expect(result.redirectedTo).toMatch(/\/live-animals\/templates$/)
    }
  )
})
