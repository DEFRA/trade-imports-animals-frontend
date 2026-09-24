import { SET_ID } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { copy as transportCopy } from '../features/transport/copy/copy.en.js'
import { taskRowById } from './task-rows.js'
import {
  cardStoredErrors,
  invalidRowIds,
  rowStoredErrors
} from './stored-answers.js'

// Absent from the captured ports fixture (see port-of-entry.controller.test.js),
// so it doubles here as an out-of-list "stale" stored code.
const STALE_PORT = 'GB ZZZ'
const KNOWN_PORT = 'GB ABD'
const portMessage = transportCopy.portOfEntry.errors.portNoLongerAvailable

beforeAll(() => {
  buildDispatch(SET_ID, dispatchPages)
})

describe('#rowStoredErrors', () => {
  it('Should return nothing for a row whose pages carry no validation', async () => {
    const errors = await rowStoredErrors(taskRowById('origin'), {}, {})
    expect(errors).toEqual({})
  })

  it('Should return the page own field message when a stored answer no longer passes its rules', async () => {
    const errors = await rowStoredErrors(
      taskRowById('arrivalDetails'),
      { portOfEntry: STALE_PORT },
      {}
    )
    expect(errors).toEqual({ portOfEntry: portMessage })
  })

  it('Should return nothing when the stored answer still passes', async () => {
    const errors = await rowStoredErrors(
      taskRowById('arrivalDetails'),
      { portOfEntry: KNOWN_PORT },
      {}
    )
    expect(errors).toEqual({})
  })
})

describe('#invalidRowIds', () => {
  it('Should hold only the row whose stored answer no longer passes its rules', async () => {
    const invalid = await invalidRowIds({ portOfEntry: STALE_PORT }, {})
    expect(invalid.has('arrivalDetails')).toBe(true)
    expect(invalid.has('origin')).toBe(false)
  })

  it('Should be empty for answers that pass every rule the rows carry', async () => {
    const invalid = await invalidRowIds({ portOfEntry: KNOWN_PORT }, {})
    expect(invalid.size).toBe(0)
  })
})

describe('#cardStoredErrors', () => {
  // A card-shaped list, not REVIEW_CARDS itself: `cardStoredErrors` is generic
  // over any list of `{ id, rows }`, and this exercises "first row to produce
  // a message wins" without depending on which pages carry a validation today.
  const twoRowCard = { id: 'test', rows: ['origin', 'arrivalDetails'] }

  it('Should take the first message a card rows produced', async () => {
    const errors = await cardStoredErrors(
      [twoRowCard],
      { portOfEntry: STALE_PORT },
      {}
    )
    expect(errors).toEqual({ test: portMessage })
  })

  it('Should carry no entry for a card whose rows all pass', async () => {
    const errors = await cardStoredErrors(
      [twoRowCard],
      { portOfEntry: KNOWN_PORT },
      {}
    )
    expect(errors).toEqual({})
  })
})
