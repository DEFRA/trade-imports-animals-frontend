import { describe, expect, it } from 'vitest'

import { DRAFT } from '../../../../../../../../engine/index.js'
import { toRow } from './index.js'

/**
 * Late enough in the UTC evening to have already become the next day in
 * `Europe/London` — the one shape of instant the two renderers disagree about.
 * The calendar renderer reads the UTC components and says 10 September; the
 * moment renderer converts into the service zone and says 11 September.
 *
 * The other direction does not exist: the UK is never behind UTC, so a
 * calendar date, read off the UTC components of its `Date`, renders as the
 * same day whichever renderer sees it. That is why the created and submitted columns,
 * not the arrival column, are what pin the pairing on a realistic row.
 */
const LATE_EVENING_INSTANT = '2026-09-10T23:35:39.455Z'
const ITS_UTC_DAY = '10 Sep 2026'
const ITS_LONDON_DAY = '11 Sep 2026'

/** A calendar date the user chose, as the wire carries it, falling in BST. */
const BST_ARRIVAL_DATE = '2026-07-21'
const BST_ARRIVAL_DAY = '21 Jul 2026'

const draftJourney = (overrides = {}) => ({
  journeyId: 'GBN-AG-26-ABCDEF',
  status: DRAFT,
  ...overrides
})

describe('#toRow date columns', () => {
  it('Should render a BST arrival as the day chosen and a late-evening creation as its UK day', async () => {
    const row = await toRow(
      draftJourney({
        arrivalDate: BST_ARRIVAL_DATE,
        createdAt: LATE_EVENING_INSTANT,
        submittedAt: LATE_EVENING_INSTANT
      })
    )

    expect(row).toMatchObject({
      arrival: BST_ARRIVAL_DAY,
      created: ITS_LONDON_DAY,
      submitted: ITS_LONDON_DAY
    })
  })

  it('Should read arrival off its own UTC components while created and submitted convert into the service zone', async () => {
    // One instant into all three columns, so the row has to answer with two
    // different days. Exchanging the two renderers in `toRow` swaps both
    // answers and fails here; asserting either column on its own would not.
    // The API never sends an arrival date with a time — it is `YYYY-MM-DD` on
    // the wire — so the arrival value here is a probe, not a realistic row.
    const row = await toRow(
      draftJourney({
        arrivalDate: LATE_EVENING_INSTANT,
        createdAt: LATE_EVENING_INSTANT,
        submittedAt: LATE_EVENING_INSTANT
      })
    )

    expect(row).toMatchObject({
      arrival: ITS_UTC_DAY,
      created: ITS_LONDON_DAY,
      submitted: ITS_LONDON_DAY
    })
  })
})
