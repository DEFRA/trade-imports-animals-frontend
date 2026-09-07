import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import * as importReasonPurpose from '../../../../../../../services/import-reason-purpose/index.js'
import * as ports from '../../../../../../../services/ports/index.js'
import { dispatchPages } from '../../index.js'

import * as importReason from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('import-reason copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    leaves(copy).forEach(({ path, value }) => {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    })
  })

  it('Should carry a hint for every service reason option', () => {
    for (const option of importReasonPurpose.reasons()) {
      expect(copy.reasonHints[option.value]).toBeTruthy()
    }
  })

  it('Should carry a hint for every service purpose option the internal-market reveal asks', () => {
    for (const option of importReasonPurpose.purposes()) {
      expect(copy.purpose.hints[option.value]).toBeTruthy()
    }
  })

  // Design release 1 closes every internal-market purpose hint with a full
  // stop. Four of them had lost theirs, so the whole set is pinned rather
  // than the four that drifted.
  it('Should close every internal-market purpose hint with a full stop', () => {
    for (const [value, hint] of Object.entries(copy.purpose.hints)) {
      expect(hint.endsWith('.'), `${value} must end in a full stop`).toBe(true)
    }
    for (const [value, hint] of Object.entries(copyCy.purpose.hints)) {
      expect(hint.endsWith('.'), `${value} must end in a full stop`).toBe(true)
    }
  })

  // The sale/gift hint also carried a wrong possessive, a comma splitting
  // "aim" from what it governs, and "e.g." where GDS style wants the words.
  it('Should write the sale or gift hint in plain, correct English', () => {
    const hint = copy.purpose.hints['transfer-of-ownership-sale-gift']
    expect(hint).toContain('has as its aim the sale of')
    expect(hint).toContain('with no sale involved (for example a gift).')
    expect(hint).not.toContain('e.g.')
    expect(
      copyCy.purpose.hints['transfer-of-ownership-sale-gift']
    ).not.toContain('e.e.')
  })

  // The reason a reveal belongs to is where the explanation sits, so the
  // follow-up questions ask with a label alone and the exit date keeps only
  // its worked example.
  it('Should ask the destination country and the port of exit without a hint', () => {
    expect(copy.country.hint).toBeUndefined()
    expect(copy.port.hint).toBeUndefined()
    expect(copyCy.country.hint).toBeUndefined()
    expect(copyCy.port.hint).toBeUndefined()
  })

  it('Should hint the exit date with the worked example alone', () => {
    expect(copy.date.hint).toBe('For example, 27/3/2026')
    expect(copyCy.date.hint).toBe('Er enghraifft, 27/3/2026')
  })

  // Design release 1 asks for a choice the user has yet to make, so the two
  // select errors take the indefinite article. Welsh carries the same sense
  // by dropping the definite article rather than adding one.
  it('Should ask for a destination country and a port of exit', () => {
    expect(copy.errors.countryRequired).toBe('Select a destination country')
    expect(copy.errors.portRequired).toBe('Select a port of exit')
    expect(copyCy.errors.countryRequired).toBe('Dewiswch wlad gyrchfan')
    expect(copyCy.errors.portRequired).toBe('Dewiswch borthladd ymadael')
  })

  // The unreadable-date message does not repeat the field name that is
  // already the legend and the label above it.
  it('Should report an unreadable exit date without naming the field again', () => {
    expect(copy.errors.dateInvalid).toBe('Enter a real date')
    expect(copyCy.errors.dateInvalid).toBe('Rhowch ddyddiad go iawn')
  })
})

describe('GET import-reason — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and hint every option from it', async () => {
    const get = importReason.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    for (const option of result.view.context.reasonOptions) {
      expect(option.hint.text).toBe(copy.reasonHints[option.value])
    }
    for (const option of result.view.context.purposeOptions) {
      expect(option.hint.text).toBe(copy.purpose.hints[option.value])
    }
  })

  it('Should carry the reveal placeholders, the port list and the exit-date label into the view', async () => {
    const get = importReason.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)

    expect(result.view.context.countryItems[0].text).toBe(
      copy.country.placeholder
    )
    expect(result.view.context.portItems[0].text).toBe(copy.port.placeholder)
    expect(result.view.context.portItems.slice(2)).toEqual(
      ports.list().map((port) => ({
        value: port.code,
        text: `${port.name} (${port.code})`
      }))
    )
    expect(result.view.context.exitDateField.label.text).toBe(copy.date.label)
  })
})
