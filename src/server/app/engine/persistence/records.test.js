import { SET_ID } from '../../../../../test/fixtures/index.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  configureRecords,
  configureTemplateRecords,
  records
} from './records.js'
import { withTemplateMode } from '../../shared/template-mode.js'
import { withSetContext } from '../../shared/set-context.js'

const OWNER = '2100010101'

const portStub = (label) => ({
  load: vi.fn(async () => ({ label })),
  replaceFulfilment: vi.fn(async () => ({ label })),
  has: vi.fn(async () => true),
  clear: vi.fn(async () => {})
})

describe('records port in template mode', () => {
  const notifications = portStub('notification')
  const templates = portStub('template')

  beforeEach(() => {
    configureRecords(SET_ID, notifications)
    configureTemplateRecords(SET_ID, templates)
  })

  it('Should read through the notification records outside template mode', async () => {
    expect(await records.load({ journeyId: 'x' })).toEqual({
      label: 'notification'
    })
    expect(templates.load).not.toHaveBeenCalled()
  })

  it('Should read and write through the template records in template mode', async () => {
    const loaded = await withTemplateMode(OWNER, () =>
      records.load({ journeyId: 'x' })
    )
    const saved = await withTemplateMode(OWNER, () =>
      records.replaceFulfilment('x', {})
    )

    expect(loaded).toEqual({ label: 'template' })
    expect(saved).toEqual({ label: 'template' })
    expect(notifications.load).not.toHaveBeenCalledWith({ journeyId: 'x' })
  })

  it('Should name the set when template mode is entered without template records', async () => {
    await withSetContext('no-templates', async () => {
      await expect(
        withTemplateMode(OWNER, () => records.load({ journeyId: 'x' }))
      ).rejects.toThrow(
        'template records not configured for set "no-templates"'
      )
    })
  })
})
