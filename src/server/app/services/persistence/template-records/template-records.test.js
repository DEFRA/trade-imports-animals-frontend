import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DRAFT } from '../../../engine/persistence/records.js'
import { withTemplateMode } from '../../../shared/template-mode.js'
import * as templates from '../../templates/index.js'
import { createTemplateRecords } from './index.js'

const templateRecords = createTemplateRecords()
const NOT_HELD_ID = '12b3c4d5-e6f7-4a08-8b9a-1c2d3e4f5a6b'
const HELD_ID = '23c4d5e6-f7a8-4b09-8cab-2d3e4f5a6b7c'

const OWNER = '2100010101'
const TEMPLATE_ID = 'template-1'

const stored = (overrides = {}) => ({
  id: TEMPLATE_ID,
  name: 'Weekly cattle',
  setId: 'live-animals',
  created: '2026-01-01T10:00:00Z',
  status: 'IN_PROGRESS',
  version: 3,
  fulfilments: [],
  ...overrides
})

const inTemplateMode = (fn) => withTemplateMode(OWNER, fn)

describe('template records', () => {
  beforeEach(() => {
    vi.spyOn(templates, 'getFor').mockResolvedValue(stored())
    vi.spyOn(templates, 'replaceFulfilmentsFor').mockResolvedValue(stored())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should load the signed-in owner’s template shaped like a draft journey', async () => {
    const journey = await inTemplateMode(() =>
      templateRecords.load({ journeyId: TEMPLATE_ID })
    )

    expect(templates.getFor).toHaveBeenCalledWith(OWNER, TEMPLATE_ID)
    expect(journey).toEqual({
      journeyId: TEMPLATE_ID,
      status: DRAFT,
      createdAt: '2026-01-01T10:00:00Z',
      submittedAt: null,
      concurrencyToken: 3,
      fulfilment: {},
      templateName: 'Weekly cattle',
      setId: 'live-animals'
    })
  })

  it('Should load nothing for a template the owner does not have', async () => {
    templates.getFor.mockResolvedValue(undefined)

    const journey = await inTemplateMode(() =>
      templateRecords.load({ journeyId: TEMPLATE_ID })
    )

    expect(journey).toBeUndefined()
    expect(await inTemplateMode(() => templateRecords.has(TEMPLATE_ID))).toBe(
      false
    )
  })

  it('Should store the same encoded fulfilments a notification does', async () => {
    await inTemplateMode(() =>
      templateRecords.replaceFulfilment(TEMPLATE_ID, {})
    )

    expect(templates.replaceFulfilmentsFor).toHaveBeenCalledWith(
      OWNER,
      TEMPLATE_ID,
      []
    )
  })

  describe('an obligation the template never holds', () => {
    const records = createTemplateRecords({ notHeld: [NOT_HELD_ID] })
    const answers = {
      [NOT_HELD_ID]: { day: '1', month: '2', year: '2027' },
      [HELD_ID]: 'GB ABD'
    }

    it('Should drop it on a write and keep the rest', async () => {
      await inTemplateMode(() =>
        records.replaceFulfilment(TEMPLATE_ID, structuredClone(answers))
      )

      expect(templates.replaceFulfilmentsFor).toHaveBeenCalledWith(
        OWNER,
        TEMPLATE_ID,
        [{ obligationId: HELD_ID, value: 'GB ABD' }]
      )
    })

    it('Should drop it on a load of a template that once held it', async () => {
      templates.getFor.mockResolvedValue(
        stored({
          fulfilments: [
            { obligationId: NOT_HELD_ID, value: answers[NOT_HELD_ID] },
            { obligationId: HELD_ID, value: 'GB ABD' }
          ]
        })
      )

      const journey = await inTemplateMode(() =>
        records.load({ journeyId: TEMPLATE_ID })
      )

      expect(journey.fulfilment).toEqual({ [HELD_ID]: 'GB ABD' })
    })

    it('Should let everything through when nothing is declared not held', async () => {
      templates.getFor.mockResolvedValue(
        stored({
          fulfilments: [
            { obligationId: NOT_HELD_ID, value: answers[NOT_HELD_ID] }
          ]
        })
      )

      const journey = await inTemplateMode(() =>
        templateRecords.load({ journeyId: TEMPLATE_ID })
      )

      expect(journey.fulfilment).toEqual({
        [NOT_HELD_ID]: answers[NOT_HELD_ID]
      })
    })
  })

  it.each([
    'create',
    'list',
    'finalise',
    'amend',
    'cancelAmend',
    'copy',
    'softDelete'
  ])('Should not offer %s in template mode', async (operation) => {
    await expect(templateRecords[operation]()).rejects.toThrow(
      `${operation} is not offered in template mode`
    )
  })

  it('Should let clear do nothing', async () => {
    await expect(templateRecords.clear()).resolves.toBeUndefined()
  })
})
