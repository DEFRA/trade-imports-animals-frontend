import { describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../../../../shared/paths.js'
import { copy as sharedCopy } from '../../../../../../../../shared/copy.en.js'
import {
  registerSetMount,
  withSetContext
} from '../../../../../../../../shared/set-context.js'
import { copy } from '../../copy/copy.en.js'
import { toRow } from './index.js'

registerSetMount('plant-products', '/plant-products')

const journey = (overrides = {}) => ({
  journeyId: 'GBN-PP-26-ABC123',
  status: 'draft',
  originCountryCode: 'IE',
  arrivalDate: '2026-03-07',
  createdAt: '2026-03-01T12:00:00Z',
  submittedAt: null,
  ...overrides
})

const inPlantProducts = (operation) =>
  withSetContext('plant-products', operation)

const expectPlantProductsActionPaths = (actions) => {
  const paths = actions.flatMap(({ href, postAction }) =>
    [href, postAction].filter(Boolean)
  )

  expect(paths.length).toBeGreaterThan(0)
  paths.forEach((path) => expect(path).toMatch(/^\/plant-products\//))
}

describe('plant-products dashboard row view model', () => {
  it.each([
    ['draft', copy.statuses.draft, 'govuk-tag--grey'],
    ['submitted', copy.statuses.submitted, 'govuk-tag--blue'],
    ['amend', copy.statuses.amend, 'govuk-tag--yellow']
  ])('renders the shared %s vocabulary', (status, label, tagClass) => {
    expect(inPlantProducts(() => toRow(journey({ status }))).status).toEqual({
      label,
      tagClass
    })
  })

  it('resolves origin and formats every date consistently', () => {
    expect(
      inPlantProducts(() =>
        toRow(journey({ submittedAt: '2026-03-08T09:00:00Z' }))
      )
    ).toMatchObject({
      origin: 'Republic of Ireland',
      arrival: '7 March 2026',
      created: '1 March 2026',
      submitted: '8 March 2026'
    })
  })

  it('draft has Continue-to-hub and Delete actions', () => {
    const actions = inPlantProducts(
      () => toRow(journey({ status: 'draft' })).actions
    )

    expectPlantProductsActionPaths(actions)
    expect(actions).toEqual([
      {
        text: copy.actions.continue,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: inPlantProducts(() => hubPath('GBN-PP-26-ABC123'))
      },
      {
        text: sharedCopy.notificationActions.delete.text,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: inPlantProducts(() => pagePath('GBN-PP-26-ABC123', 'delete'))
      }
    ])
  })

  it.each(['submitted', 'amend'])(
    '%s has a Copy action with a fresh key',
    (status) => {
      const first = inPlantProducts(() => toRow(journey({ status })))
      const second = inPlantProducts(() => toRow(journey({ status })))
      const firstCopy = first.actions.find(
        ({ text }) => text === sharedCopy.notificationActions.copy.text
      )
      const secondCopy = second.actions.find(
        ({ text }) => text === sharedCopy.notificationActions.copy.text
      )

      expectPlantProductsActionPaths(first.actions)
      expectPlantProductsActionPaths(second.actions)
      expect(firstCopy).toEqual({
        text: sharedCopy.notificationActions.copy.text,
        hiddenText: 'notification GBN-PP-26-ABC123',
        postAction: inPlantProducts(() => pagePath('GBN-PP-26-ABC123', 'copy')),
        idempotencyKey: expect.any(String),
        copyOrigin: 'dashboard'
      })
      expect(secondCopy.idempotencyKey).not.toBe(firstCopy.idempotencyKey)
    }
  )

  it('submitted has View and Amend before the existing Copy and Delete actions', () => {
    const actions = inPlantProducts(
      () => toRow(journey({ status: 'submitted' })).actions
    )

    expectPlantProductsActionPaths(actions)
    expect(actions).toEqual([
      {
        text: copy.actions.view,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: inPlantProducts(() =>
          pagePath('GBN-PP-26-ABC123', 'review-notification')
        )
      },
      {
        text: copy.actions.amend,
        hiddenText: 'notification GBN-PP-26-ABC123',
        postAction: inPlantProducts(() => pagePath('GBN-PP-26-ABC123', 'amend'))
      },
      {
        text: sharedCopy.notificationActions.copy.text,
        hiddenText: 'notification GBN-PP-26-ABC123',
        postAction: inPlantProducts(() => pagePath('GBN-PP-26-ABC123', 'copy')),
        idempotencyKey: expect.any(String),
        copyOrigin: 'dashboard'
      },
      {
        text: sharedCopy.notificationActions.delete.text,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: inPlantProducts(() => pagePath('GBN-PP-26-ABC123', 'delete'))
      }
    ])
  })

  it('amend has Resume and Cancel amendment around existing Copy and Delete actions', () => {
    const actions = inPlantProducts(
      () => toRow(journey({ status: 'amend' })).actions
    )

    expectPlantProductsActionPaths(actions)
    expect(actions).toEqual([
      {
        text: copy.actions.resume,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: inPlantProducts(() => hubPath('GBN-PP-26-ABC123'))
      },
      {
        text: sharedCopy.notificationActions.copy.text,
        hiddenText: 'notification GBN-PP-26-ABC123',
        postAction: inPlantProducts(() => pagePath('GBN-PP-26-ABC123', 'copy')),
        idempotencyKey: expect.any(String),
        copyOrigin: 'dashboard'
      },
      {
        text: copy.actions.cancelAmend,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: inPlantProducts(() =>
          pagePath('GBN-PP-26-ABC123', 'cancel-amend')
        )
      },
      {
        text: sharedCopy.notificationActions.delete.text,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: inPlantProducts(() => pagePath('GBN-PP-26-ABC123', 'delete'))
      }
    ])
  })

  it('reuses the recoverable retry key only for its matching row', () => {
    const retryCopy = {
      journeyId: 'GBN-PP-26-ABC123',
      idempotencyKey: 'same-retry-key'
    }
    const matching = inPlantProducts(() =>
      toRow(journey({ status: 'submitted' }), retryCopy)
    )
    const other = inPlantProducts(() =>
      toRow(
        journey({ journeyId: 'GBN-PP-26-OTHER', status: 'submitted' }),
        retryCopy
      )
    )
    const matchingCopy = matching.actions.find(
      ({ text }) => text === sharedCopy.notificationActions.copy.text
    )
    const otherCopy = other.actions.find(
      ({ text }) => text === sharedCopy.notificationActions.copy.text
    )

    expectPlantProductsActionPaths(matching.actions)
    expectPlantProductsActionPaths(other.actions)
    expect(matchingCopy.idempotencyKey).toBe('same-retry-key')
    expect(otherCopy.idempotencyKey).not.toBe('same-retry-key')
  })

  it('unknown and missing facts degrade to blanks without throwing', () => {
    expect(inPlantProducts(() => toRow({ status: 'unknown' }))).toEqual({
      reference: '',
      status: { label: '', tagClass: '' },
      origin: '',
      arrival: '',
      created: '',
      submitted: '',
      actions: []
    })
  })
})
