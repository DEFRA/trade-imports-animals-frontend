import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  completeOpeningRun: vi.fn(),
  get: vi.fn(),
  rowStatuses: {},
  sectionEntry: vi.fn()
}))

vi.mock('../../../../../../engine/index.js', () => ({
  AMEND: 'AMEND',
  DELETED: 'DELETED',
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  get: mocks.get
}))
vi.mock('../../../../../../flow/navigation.js', () => ({
  rowEntry: (row, _scope, journeyId) =>
    `/plant-products/notifications/${journeyId}/${row.id}`,
  rowGatePasses: () => true,
  sectionEntry: mocks.sectionEntry
}))
vi.mock('../../../../../../flow/run-state.js', () => ({
  completeOpeningRun: mocks.completeOpeningRun
}))
vi.mock('../../../../../../flow/section-status.js', () => ({
  sectionStatus: () => 'not-started'
}))
vi.mock('../../../../../../shared/paths.js', () => ({
  dashboardPath: () => '/plant-products',
  hubRoutePath: () => '/notifications/{journeyId}'
}))
vi.mock('../../flow/task-rows.js', () => ({
  taskRowById: (id) => ({ id, conditional: id === 'transport' }),
  rowStatus: (row) => mocks.rowStatuses[row.id] ?? 'not-started'
}))

import { routes } from './controller.js'

const renderHub = async (readyForCheckYourAnswers) => {
  mocks.get.mockResolvedValue({
    journey: undefined,
    answers: {},
    scope: {
      readyForCheckYourAnswers,
      inScope: new Set()
    },
    evaluation: {}
  })
  const h = {
    view: vi.fn((_view, model) => model)
  }

  return routes[0].handler({ params: { journeyId: 'journey-1' } }, h)
}

const itemFor = (model, groupId) =>
  model.groups.find(({ id }) => id === groupId).items[0]

describe('plant-products hub controller', () => {
  beforeEach(() => {
    mocks.rowStatuses = {}
    mocks.sectionEntry.mockReset()
    mocks.sectionEntry.mockReturnValue(
      '/plant-products/notifications/journey-1/notification-view'
    )
  })

  it('blocks Review and submit while its authored section gate fails', async () => {
    const model = await renderHub(false)

    expect(itemFor(model, 'review')).toEqual({
      title: { text: 'Review and submit' },
      hint: {
        text: 'Check your answers before you submit the notification'
      },
      status: {
        text: 'Cannot start yet',
        classes: 'govuk-task-list__status--cannot-start-yet'
      }
    })
    expect(mocks.sectionEntry).not.toHaveBeenCalled()
  })

  it('opens Review and submit when every mandatory row satisfies its gate', async () => {
    const model = await renderHub(true)

    expect(itemFor(model, 'review')).toEqual({
      title: { text: 'Review and submit' },
      hint: {
        text: 'Check your answers before you submit the notification'
      },
      href: '/plant-products/notifications/journey-1/notification-view',
      status: {
        tag: { text: 'Not yet started', classes: 'govuk-tag--blue' }
      }
    })
    expect(mocks.sectionEntry).toHaveBeenCalledWith(
      'review',
      expect.objectContaining({ readyForCheckYourAnswers: true }),
      'journey-1'
    )
  })

  it('hides conditional not-applicable rows and renders Optional as text', async () => {
    mocks.rowStatuses = {
      purpose: 'optional',
      transport: 'not-applicable'
    }

    const model = await renderHub(false)

    expect(model.groups.find(({ id }) => id === 'transport').items).toEqual([])
    expect(itemFor(model, 'purpose').status).toEqual({ text: 'Optional' })
  })
})
