import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DRAFT } from '../../../engine/persistence/records.js'
import { withTemplateMode } from '../../../shared/template-mode.js'
import * as templates from '../../templates/index.js'
import { templateRecords } from './index.js'

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
