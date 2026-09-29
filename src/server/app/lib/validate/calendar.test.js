import { describe, expect, it } from 'vitest'

import {
  addUtcDays,
  addUtcMonths,
  formatDateText,
  formatInServiceZone,
  instantFromDateParts,
  parseDateText,
  startOfDayInZone,
  startOfUtcDay
} from './calendar.js'

const utc = (year, month, day) => new Date(Date.UTC(year, month - 1, day))

/** A calendar date as the wire carries it: the chosen day, labelled UTC midnight. */
const ARRIVAL_INSTANT = '2026-07-21T00:00:00.000Z'
const ARRIVAL_DISPLAY = '21 Jul 2026'
const PADDED_INSTANT = '2026-03-05T00:00:00.000Z'
/** A moment, late enough in the UTC day that London is already on the next one. */
const SUBMITTED_INSTANT = '2026-09-10T23:35:39.455Z'
const SUBMITTED_DISPLAY = '11 Sep 2026'

/**
 * The suite runs under `TZ=UTC` (see `package.json`), which is the one setting
 * where an ambient-zone bug and a zone-explicit fix agree — so a test that does
 * not change the zone cannot fail even when the bug is live.
 *
 * `America/New_York` is the only west-of-UTC zone in this repo, and it is here
 * on purpose: west of UTC is where a UTC-midnight calendar date renders a day
 * early, and where a local-components `Date` builds the wrong instant. Do not
 * "tidy" it to match the rest of the suite — that silently disarms the test.
 */
const runInZone = (zone, assertions) => {
  const original = process.env.TZ
  process.env.TZ = zone
  try {
    // Prove the override actually took: Node caches the zone, and if a future
    // runtime stops honouring reassignment these tests would pass vacuously.
    const offsetMinutes = new Date('2026-07-21T00:00:00Z').getTimezoneOffset()
    expect(offsetMinutes).toBeGreaterThan(0)
    assertions()
  } finally {
    process.env.TZ = original
  }
}

describe('#startOfUtcDay', () => {
  it('strips the time from an instant', () => {
    expect(startOfUtcDay(new Date('2026-08-12T23:45:12.500Z'))).toEqual(
      utc(2026, 8, 12)
    )
  })
})

describe('#startOfDayInZone', () => {
  it('takes the London day, not the UTC one, in the hour they disagree', () => {
    // 00:30 on 12 August in London is still 23:30 on the 11th in UTC.
    expect(
      startOfDayInZone(new Date('2026-08-11T23:30:00Z'), 'Europe/London')
    ).toEqual(utc(2026, 8, 12))
  })

  it('agrees with the UTC day outside British Summer Time', () => {
    expect(
      startOfDayInZone(new Date('2026-01-11T23:30:00Z'), 'Europe/London')
    ).toEqual(utc(2026, 1, 11))
  })
})

describe('#addUtcDays', () => {
  it('moves forward across a month boundary', () => {
    expect(addUtcDays(utc(2026, 8, 30), 3)).toEqual(utc(2026, 9, 2))
  })

  it('moves backward when given a negative count', () => {
    expect(addUtcDays(utc(2026, 3, 2), -3)).toEqual(utc(2026, 2, 27))
  })

  it('crosses a leap day', () => {
    expect(addUtcDays(utc(2028, 2, 28), 1)).toEqual(utc(2028, 2, 29))
  })
})

describe('#addUtcMonths', () => {
  it('clamps to the last day of a shorter target month', () => {
    expect(addUtcMonths(utc(2026, 8, 31), 6)).toEqual(utc(2027, 2, 28))
  })

  it('clamps to 29 February in a leap year', () => {
    expect(addUtcMonths(utc(2027, 8, 31), 6)).toEqual(utc(2028, 2, 29))
  })

  it('moves backward across a year boundary', () => {
    expect(addUtcMonths(utc(2026, 2, 15), -3)).toEqual(utc(2025, 11, 15))
  })
})

describe('#parseDateText', () => {
  it.each([
    ['5/8/2026', utc(2026, 8, 5)],
    ['05/08/2026', utc(2026, 8, 5)],
    ['  5/8/2026  ', utc(2026, 8, 5)]
  ])('parses %s', (raw, expected) => {
    expect(parseDateText(raw)).toEqual(expected)
  })

  it.each([
    ['31/2/2026'],
    ['32/1/2026'],
    ['5/13/2026'],
    ['5-8-2026'],
    ['27/3/26'],
    ['5/8/26'],
    ['not a date'],
    [''],
    ['   '],
    [null],
    [undefined]
  ])('rejects %s', (raw) => {
    expect(parseDateText(raw)).toBeNull()
  })
})

describe('#formatDateText', () => {
  it('drops leading zeros, matching what the picker writes back', () => {
    expect(formatDateText(utc(2026, 8, 5))).toBe('5/8/2026')
  })

  it('keeps two-digit days and months intact', () => {
    expect(formatDateText(utc(2026, 12, 25))).toBe('25/12/2026')
  })

  it('round-trips with parseDateText', () => {
    expect(parseDateText(formatDateText(utc(2027, 2, 28)))).toEqual(
      utc(2027, 2, 28)
    )
  })
})

describe('#instantFromDateParts', () => {
  it('labels the parts as UTC midnight', () => {
    expect(instantFromDateParts({ day: 21, month: 7, year: 2026 })).toBe(
      ARRIVAL_INSTANT
    )
  })

  it('zero-pads a single-digit day and month', () => {
    expect(instantFromDateParts({ day: 5, month: 3, year: 2026 })).toBe(
      PADDED_INSTANT
    )
  })

  it('accepts string parts, as the answer store holds them', () => {
    expect(instantFromDateParts({ day: '5', month: '3', year: '2026' })).toBe(
      PADDED_INSTANT
    )
  })

  it.each([
    ['no parts at all', undefined],
    ['an empty object', {}],
    ['a missing day', { month: 7, year: 2026 }],
    ['a missing month', { day: 21, year: 2026 }],
    ['a missing year', { day: 21, month: 7 }]
  ])('returns undefined for %s', (_label, parts) => {
    expect(instantFromDateParts(parts)).toBeUndefined()
  })

  it('produces the same instant west of UTC as it does under UTC', () => {
    // The zone proof. `new Date(year, month - 1, day).toISOString()` would give
    // 2026-07-20T04:00:00.000Z here and the right answer under TZ=UTC — wrong
    // only where nobody looks. Labelling as UTC cannot drift.
    const underUtc = instantFromDateParts({ day: 21, month: 7, year: 2026 })

    runInZone('America/New_York', () => {
      expect(instantFromDateParts({ day: 21, month: 7, year: 2026 })).toBe(
        underUtc
      )
    })
  })
})

describe('#formatInServiceZone', () => {
  it('renders a calendar date as the day the user typed', () => {
    expect(formatInServiceZone(new Date(ARRIVAL_INSTANT))).toBe(ARRIVAL_DISPLAY)
  })

  it('renders a moment as the UK day it happened, not the UTC one', () => {
    // 23:35 UTC on the 10th is 00:35 on the 11th in London during BST.
    expect(formatInServiceZone(new Date(SUBMITTED_INSTANT))).toBe(
      SUBMITTED_DISPLAY
    )
  })

  it('keeps the three-letter month date-fns produces', () => {
    // ICU's en-GB short month for September is `Sept`. The service says `Sep`,
    // and this ticket is not the place to reword it.
    expect(formatInServiceZone(new Date('2026-09-29T10:00:00.000Z'))).toBe(
      '29 Sep 2026'
    )
  })

  it('renders the same string west of UTC as it does under UTC', () => {
    // The only setting that separates an ambient-zone formatter from a
    // service-zone one: in London or UTC both implementations agree.
    runInZone('America/New_York', () => {
      expect(formatInServiceZone(new Date(ARRIVAL_INSTANT))).toBe(
        ARRIVAL_DISPLAY
      )
      expect(formatInServiceZone(new Date(SUBMITTED_INSTANT))).toBe(
        SUBMITTED_DISPLAY
      )
    })
  })
})
