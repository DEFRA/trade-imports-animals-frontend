import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  isBlank,
  decodeDateParts,
  checkFormat,
  formatCodesFor
} from './format-checks.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const readModel = (file) =>
  JSON.parse(fs.readFileSync(path.join(dirname, '..', 'model', file), 'utf8'))

const { obligations } = readModel('obligations.json')
const { messages } = readModel('messages.en.json')

const recordOf = (name) =>
  obligations.find((candidate) => candidate.name === name)

const codesOf = (findings) => findings.map((finding) => finding.code)

describe('validation/format-checks — only-when-filled validators', () => {
  it('never fails a blank value, whatever the type', () => {
    for (const record of obligations) {
      expect(checkFormat(record, undefined)).toEqual([])
      expect(checkFormat(record, '')).toEqual([])
    }
    expect(checkFormat(recordOf('extras'), [])).toEqual([])
    expect(
      checkFormat(recordOf('dateOfBirth'), { day: '', month: '', year: '' })
    ).toEqual([])
  })

  it('checks a filled email address', () => {
    const email = recordOf('email')
    expect(checkFormat(email, 'name@example.com')).toEqual([])
    expect(codesOf(checkFormat(email, 'not-an-email'))).toEqual([
      'format.email.invalid'
    ])
  })

  it('checks formatted fields against the catalogue pattern', () => {
    const postcode = recordOf('postcode')
    const registration = recordOf('registration')
    expect(checkFormat(postcode, 'SW1A 1AA')).toEqual([])
    expect(codesOf(checkFormat(postcode, 'nope'))).toEqual([
      'format.postcode.invalid'
    ])
    expect(checkFormat(registration, 'AB12 CDE')).toEqual([])
    expect(codesOf(checkFormat(registration, '123'))).toEqual([
      'format.registration.invalid'
    ])
  })

  it('checks numbers: not a number / not whole / out of range', () => {
    const year = recordOf('year')
    expect(checkFormat(year, '2012')).toEqual([])
    expect(codesOf(checkFormat(year, 'soon'))).toEqual([
      'format.year.notNumber'
    ])
    expect(codesOf(checkFormat(year, '2012.5'))).toEqual([
      'format.year.notWholeNumber'
    ])
    expect(codesOf(checkFormat(year, '1899'))).toEqual([
      'format.year.outOfRange'
    ])
    expect(codesOf(checkFormat(recordOf('penaltyPoints'), '13'))).toEqual([
      'format.penaltyPoints.outOfRange'
    ])
  })

  it('collapses every ncdYears failure onto its single catalogue code', () => {
    const ncdYears = recordOf('ncdYears')
    for (const bad of ['abc', '2.5', '0', '100']) {
      expect(codesOf(checkFormat(ncdYears, bad))).toEqual([
        'format.ncdYears.wholeNumberRange'
      ])
    }
    expect(checkFormat(ncdYears, '5')).toEqual([])
  })

  it('parses currency leniently and rejects non-positive amounts', () => {
    const estimatedValue = recordOf('estimatedValue')
    expect(checkFormat(estimatedValue, '£1,234')).toEqual([])
    expect(codesOf(checkFormat(estimatedValue, '5.50'))).toEqual([
      'format.estimatedValue.notAmount'
    ])
    expect(codesOf(checkFormat(estimatedValue, '0'))).toEqual([
      'format.estimatedValue.notPositive'
    ])
    expect(codesOf(checkFormat(recordOf('excessAmount'), '-5'))).toEqual([
      'format.excessAmount.notAmount'
    ])
  })

  it('gives claimAmount and modValue their single parity code', () => {
    expect(codesOf(checkFormat(recordOf('claimAmount'), '5e3'))).toEqual([
      'format.claimAmount.invalid'
    ])
    expect(codesOf(checkFormat(recordOf('modValue'), '0'))).toEqual([
      'format.modValue.invalid'
    ])
    expect(checkFormat(recordOf('claimAmount'), '1500')).toEqual([])
  })

  it('blocks partial and impossible dates, targeting the day part', () => {
    const dateOfBirth = recordOf('dateOfBirth')
    expect(
      checkFormat(dateOfBirth, { day: '27', month: '3', year: '1985' })
    ).toEqual([])
    for (const bad of [
      { day: '27', month: '', year: '1985' },
      { day: '31', month: '2', year: '1985' },
      { day: 'x', month: '3', year: '1985' }
    ]) {
      expect(checkFormat(dateOfBirth, bad)).toEqual([
        { code: 'format.dateOfBirth.notRealDate', focusSuffix: '-day' }
      ])
    }
  })

  it('decodes date parts from payload keys in one place', () => {
    expect(
      decodeDateParts('dateOfBirth', {
        'dateOfBirth-day': '27',
        'dateOfBirth-month': '3',
        'dateOfBirth-year': '1985'
      })
    ).toEqual({ day: '27', month: '3', year: '1985' })
    expect(decodeDateParts('dateOfBirth', { other: '1' })).toBeUndefined()
  })

  it('treats an empty array as blank (save-time, unlike the engine)', () => {
    expect(isBlank([])).toBe(true)
    expect(isBlank(['breakdown'])).toBe(false)
    expect(isBlank({ day: '', month: '', year: '' })).toBe(true)
    expect(isBlank(0)).toBe(false)
  })

  it('keeps formatCodesFor in lockstep with messages.en.json (both ways)', () => {
    const emitted = [
      ...new Set(obligations.flatMap((record) => formatCodesFor(record)))
    ].sort()
    const catalogued = Object.keys(messages)
      .filter((code) => code.startsWith('format.'))
      .sort()
    expect(emitted).toEqual(catalogued)
  })
})
