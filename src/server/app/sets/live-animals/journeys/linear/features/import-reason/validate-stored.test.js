import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'
import { REVEALS, answersFrom, formValuesFromAnswers } from './controller.js'

const VALID_COUNTRY = 'AT'
const VALID_PORT = 'GB ABD'
const VALID_PURPOSE = 'breeding'

describe('#validateStoredAnswers for import-reason', () => {
  test('Should return no errors when no reason has been chosen yet', async () => {
    expect(await validateStoredAnswers({})).toEqual({})
  })

  test('Should return no errors for re-entry (no reveal)', async () => {
    expect(await validateStoredAnswers({ reasonForImport: 'reEntry' })).toEqual(
      {}
    )
  })

  test('Should surface a reason no longer on the current list', async () => {
    const errors = await validateStoredAnswers({
      reasonForImport: 'someOldReason'
    })
    expect(errors).toHaveProperty('reasonForImport')
  })

  test('Should require the purpose under internalMarket', async () => {
    const errors = await validateStoredAnswers({
      reasonForImport: 'internalMarket'
    })
    expect(errors).toHaveProperty('purposeInInternalMarket')
  })

  test('Should accept a valid purpose under internalMarket', async () => {
    expect(
      await validateStoredAnswers({
        reasonForImport: 'internalMarket',
        purposeInInternalMarket: VALID_PURPOSE
      })
    ).toEqual({})
  })

  test('Should require the destination country under transhipmentOrOnwardTravel', async () => {
    const errors = await validateStoredAnswers({
      reasonForImport: 'transhipmentOrOnwardTravel'
    })
    expect(errors).toHaveProperty('destinationCountry')
  })

  test('Should require both port and destination country under transit', async () => {
    const errors = await validateStoredAnswers({
      reasonForImport: 'transit'
    })
    expect(errors).toHaveProperty('portOfExit')
    expect(errors).toHaveProperty('destinationCountry')
  })

  test('Should accept a fully-answered transit reason', async () => {
    expect(
      await validateStoredAnswers({
        reasonForImport: 'transit',
        portOfExit: VALID_PORT,
        destinationCountry: VALID_COUNTRY
      })
    ).toEqual({})
  })

  test('Should surface a stale destination country under transit', async () => {
    const errors = await validateStoredAnswers({
      reasonForImport: 'transit',
      portOfExit: VALID_PORT,
      destinationCountry: 'ZZ'
    })
    expect(errors).toHaveProperty('destinationCountry')
  })

  test('Should surface a stale port under transit', async () => {
    const errors = await validateStoredAnswers({
      reasonForImport: 'transit',
      portOfExit: 'XX GONE',
      destinationCountry: VALID_COUNTRY
    })
    expect(errors).toHaveProperty('portOfExit')
  })

  test('Should require the exit date under temporaryAdmissionHorses', async () => {
    const errors = await validateStoredAnswers({
      reasonForImport: 'temporaryAdmissionHorses',
      portOfExit: VALID_PORT
    })
    expect(errors).toHaveProperty('exitDate')
  })

  test('Should surface an unreadable exit date under temporaryAdmissionHorses', async () => {
    const errors = await validateStoredAnswers({
      reasonForImport: 'temporaryAdmissionHorses',
      portOfExit: VALID_PORT,
      exitDate: { day: '31', month: '2', year: '2027' }
    })
    expect(errors).toHaveProperty('exitDate')
  })

  // Round-trip: per reveal branch, form values that carry only the current
  // reveal's fields must survive answersFrom → formValuesFromAnswers under
  // those same field names. Guards the N:1 rekey (two form fields mapping
  // to one answer) against a projection bug that would drop or misroute an
  // answer.
  describe('round-trip inverse per reveal branch', () => {
    const branches = [
      {
        reason: 'internalMarket',
        formValues: { purposeInInternalMarket: VALID_PURPOSE }
      },
      {
        reason: 'transhipmentOrOnwardTravel',
        formValues: { transhipmentDestinationCountry: VALID_COUNTRY }
      },
      {
        reason: 'transit',
        formValues: {
          transitPortOfExit: VALID_PORT,
          transitDestinationCountry: VALID_COUNTRY
        }
      },
      {
        reason: 'temporaryAdmissionHorses',
        formValues: {
          temporaryAdmissionPortOfExit: VALID_PORT,
          temporaryAdmissionExitDate: { day: '15', month: '3', year: '2027' }
        }
      }
    ]

    for (const { reason, formValues } of branches) {
      test(`${reason}`, () => {
        const roundTripped = formValuesFromAnswers(
          answersFrom({ reasonForImport: reason, ...formValues })
        )
        for (const [field, expected] of Object.entries(formValues)) {
          expect(roundTripped[field]).toEqual(expected)
        }
      })
    }
  })

  test('REVEALS lists every form field once', () => {
    const allFields = Object.values(REVEALS).flatMap((r) =>
      r.map(({ field }) => field)
    )
    expect(new Set(allFields).size).toBe(allFields.length)
  })
})
