import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { pagePath } from '../../config.js'

import * as addresses from './controller.js'

const getAddresses = addresses.routes.find(
  (route) => route.method === 'GET'
).handler

const rowsFor = async (seed) => driveHandler(getAddresses, { seed })
const cphRowOf = (rows) =>
  rows.find((row) =>
    row.key.html.includes('County Parish Holding number (CPH)')
  )

describe('GET addresses — conditional CPH hub row', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should not render a CPH row when no CPH-triggering commodity line exists', async () => {
    const result = await rowsFor({
      commodityLines: [{ commoditySelection: 'Cat' }]
    })
    const { rows } = result.view.context
    expect(rows).toHaveLength(5)
    expect(cphRowOf(rows)).toBeUndefined()
  })

  it('Should render an empty-state CPH row with an Add link into cph-number when a CPH-triggering commodity line exists', async () => {
    const result = await rowsFor({
      commodityLines: [{ commoditySelection: 'Cow' }]
    })
    const { rows } = result.view.context
    const cphRow = cphRowOf(rows)
    expect(rows).toHaveLength(6)
    expect(cphRow.value.text).toBe('Not added yet')
    expect(cphRow.actions.items[0]).toMatchObject({
      href: pagePath(result.journeyId, 'cph-number?return=addresses'),
      text: 'Add'
    })
  })

  it('Should render the stored (slash-stripped) CPH value with a Change link when answered', async () => {
    const result = await rowsFor({
      commodityLines: [{ commoditySelection: 'Cow' }],
      countyParishHoldingCph: '123456789'
    })
    const { rows } = result.view.context
    const cphRow = cphRowOf(rows)
    expect(cphRow.value.text).toBe('123456789')
    expect(cphRow.actions.items[0].text).toBe('Change')
  })
})
