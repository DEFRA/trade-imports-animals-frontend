import { describe, expect, it, vi } from 'vitest'

import { runInZone } from '../../../common/test-helpers/run-in-zone.js'
import {
  addUtcDays,
  addUtcMonths,
  formatCalendarDate,
  formatDateText,
  formatMomentAsDay,
  isoDateFromDateParts,
  parseDateText,
  startOfDayInZone,
  startOfUtcDay
} from './calendar.js'

const utc = (year, month, day) => new Date(Date.UTC(year, month - 1, day))

/** A calendar date as the wire carries it: the chosen day, with no time and no zone. */
const ARRIVAL_ISO_DATE = '2026-07-21'
/** The same day as the `Date` the renderers are handed: its UTC components are the day. */
const ARRIVAL_INSTANT = '2026-07-21T00:00:00.000Z'
const ARRIVAL_DISPLAY = '21 Jul 2026'
const PADDED_ISO_DATE = '2026-03-05'
/** A moment, late enough in the UTC day that London is already on the next one. */
const SUBMITTED_INSTANT = '2026-09-10T23:35:39.455Z'
const SUBMITTED_DISPLAY = '11 Sep 2026'

/**
 * West of UTC, and the only zone on that side in this repo. It is here on
 * purpose: west of UTC is where a calendar date renders a day early if anything
 * converts it into the zone. Do not "tidy" it to match the rest of the suite —
 * that silently disarms the tests.
 */
const WEST_OF_UTC = 'America/New_York'

/**
 * East of UTC, for showing that a calendar date does not move either way. It
 * is also the side where a date built from local components and read back in
 * UTC comes out a day early, so it is what arms the `isoDateFromDateParts`
 * zone proof.
 */
const EAST_OF_UTC = 'Pacific/Auckland'

/**
 * Re-imports `calendar.js` against a service zone west of UTC, so that tests can
 * ask what the renderers do if this service ever moved to that side. Nothing
 * else can: `Europe/London` is never behind UTC, so under the real constant a
 * converting renderer and a non-converting one agree on every calendar date.
 * @param {(calendar: typeof import('./calendar.js')) => void} assertions
 */
const withServiceZoneWestOfUtc = async (assertions) => {
  vi.resetModules()
  vi.doMock('./service-time-zone.js', () => ({
    SERVICE_TIME_ZONE: WEST_OF_UTC
  }))
  try {
    assertions(await import('./calendar.js'))
  } finally {
    vi.doUnmock('./service-time-zone.js')
    vi.resetModules()
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

describe('#isoDateFromDateParts', () => {
  it('writes the parts as a date with no time and no offset', () => {
    expect(isoDateFromDateParts({ day: 21, month: 7, year: 2026 })).toBe(
      ARRIVAL_ISO_DATE
    )
  })

  it('zero-pads a single-digit day and month', () => {
    expect(isoDateFromDateParts({ day: 5, month: 3, year: 2026 })).toBe(
      PADDED_ISO_DATE
    )
  })

  it('accepts string parts, as the answer store holds them', () => {
    expect(isoDateFromDateParts({ day: '5', month: '3', year: '2026' })).toBe(
      PADDED_ISO_DATE
    )
  })

  it.each([
    ['no parts at all', undefined],
    ['an empty object', {}],
    ['a missing day', { month: 7, year: 2026 }],
    ['a missing month', { day: 21, year: 2026 }],
    ['a missing year', { day: 21, month: 7 }],
    // How an all-blank optional date field arrives: `dateParts` classifies it
    // as `empty` and passes it, so this is the shape the mapper actually sees.
    // Padding it would send `0000-00-00` to the API.
    ['blank parts', { day: '', month: '', year: '' }],
    ['whitespace-only parts', { day: ' ', month: ' ', year: ' ' }],
    ['one blank part', { day: '', month: 7, year: 2026 }]
  ])('returns undefined for %s', (_label, parts) => {
    expect(isoDateFromDateParts(parts)).toBeUndefined()
  })

  it('produces the same date on either side of UTC as it does under UTC', () => {
    // The zone proof. Building the date through a local-components `Date` and
    // reading it back in UTC would give the right answer under TZ=UTC and the
    // day before east of it — wrong only where nobody looks. East is the side
    // that catches it: west of UTC that construction still lands on the same
    // day. Writing the parts straight out cannot drift either way.
    runInZone(EAST_OF_UTC, () => {
      expect(isoDateFromDateParts({ day: 21, month: 7, year: 2026 })).toBe(
        ARRIVAL_ISO_DATE
      )
    })
    runInZone(WEST_OF_UTC, () => {
      expect(isoDateFromDateParts({ day: 21, month: 7, year: 2026 })).toBe(
        ARRIVAL_ISO_DATE
      )
    })
  })
})

describe('#formatCalendarDate', () => {
  it('renders the day the user typed', () => {
    expect(formatCalendarDate(new Date(ARRIVAL_INSTANT))).toBe(ARRIVAL_DISPLAY)
  })

  it('keeps the three-letter month date-fns produces', () => {
    // ICU's en-GB short month for September is `Sept`. The service says `Sep`,
    // and this ticket is not the place to reword it.
    expect(formatCalendarDate(new Date('2026-09-29T00:00:00.000Z'))).toBe(
      '29 Sep 2026'
    )
  })

  it('reads the UTC day even for a value that is not midnight', () => {
    // Defensive: the `Date` holding a calendar date should never carry a time,
    // but if one ever does it is still the UTC day that names it.
    expect(formatCalendarDate(new Date('2026-07-21T23:59:59.999Z'))).toBe(
      ARRIVAL_DISPLAY
    )
  })

  it('does not depend on the process zone, in either direction', () => {
    // West of UTC is where an ambient-zone or service-zone implementation
    // would render the date a day early.
    runInZone(WEST_OF_UTC, () => {
      expect(formatCalendarDate(new Date(ARRIVAL_INSTANT))).toBe(
        ARRIVAL_DISPLAY
      )
    })
    runInZone(EAST_OF_UTC, () => {
      expect(formatCalendarDate(new Date(ARRIVAL_INSTANT))).toBe(
        ARRIVAL_DISPLAY
      )
    })
  })

  it('does not depend on the service zone being at or east of UTC', () =>
    // The whole point of the split: a calendar date is not converted, so it
    // survives a service zone west of UTC. The moment renderer, which does
    // convert, moves the arrival back to 20 July there — that assertion is the
    // proof the substituted zone is live, so the one below is not vacuous.
    // Rendering the calendar date through the service zone instead of reading
    // it off the UTC components would move it the same way.
    withServiceZoneWestOfUtc((calendar) => {
      expect(calendar.formatMomentAsDay(new Date(ARRIVAL_INSTANT))).toBe(
        '20 Jul 2026'
      )
      expect(calendar.formatCalendarDate(new Date(ARRIVAL_INSTANT))).toBe(
        ARRIVAL_DISPLAY
      )
    }))
})

describe('#formatMomentAsDay', () => {
  it('renders the UK day it happened, not the UTC one', () => {
    // 23:35 UTC on the 10th is 00:35 on the 11th in London during BST. This is
    // the conversion doing real work — the raw UTC day would read 10 Sep.
    expect(formatMomentAsDay(new Date(SUBMITTED_INSTANT))).toBe(
      SUBMITTED_DISPLAY
    )
  })

  it('agrees with the UTC day outside British Summer Time', () => {
    expect(formatMomentAsDay(new Date('2026-01-10T23:35:00.000Z'))).toBe(
      '10 Jan 2026'
    )
  })

  it('renders the same string west of UTC as it does under UTC', () => {
    // The only setting that separates an ambient-zone formatter from a
    // service-zone one: in London or UTC both implementations agree.
    runInZone(WEST_OF_UTC, () => {
      expect(formatMomentAsDay(new Date(SUBMITTED_INSTANT))).toBe(
        SUBMITTED_DISPLAY
      )
    })
  })
})
