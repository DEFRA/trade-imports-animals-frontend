import { describe, it, expect, beforeAll } from 'vitest'

import {
  reasonForImport,
  transporterType,
  countryOfOrigin
} from '../obligations/obligations.js'

import { evaluateState, findPage } from './contract.js'
import { buildFieldDescriptors } from './build-field-descriptors.js'

let state
beforeAll(() => {
  state = evaluateState({})
})

describe('buildFieldDescriptors', () => {
  it('picks radios for reason-for-import', () => {
    const page = findPage('reason-for-import')
    const desc = buildFieldDescriptors(page, state)
    expect(desc).toHaveLength(1)
    expect(desc[0].obligation.name).toBe('reasonForImport')
    expect(desc[0].widget).toBe('radios')
    expect(desc[0].view.args.items.map((i) => i.value)).toContain(
      'internal-market'
    )
  })

  it('picks select for country-of-origin (25 options → too many for radios)', () => {
    const page = findPage('country-of-origin')
    const desc = buildFieldDescriptors(page, state)
    expect(desc).toHaveLength(1)
    expect(desc[0].obligation.name).toBe('countryOfOrigin')
    expect(desc[0].widget).toBe('select')
  })

  it('picks a text input for internal-reference (no domain entry ⇒ string)', () => {
    const page = findPage('internal-reference')
    const desc = buildFieldDescriptors(page, state)
    expect(desc[0].widget).toBe('text')
  })

  it('picks a date input for arrival-details date part', () => {
    const page = findPage('arrival-details')
    const desc = buildFieldDescriptors(page, state)
    const dateEntry = desc.find(
      (d) => d.obligation.name === 'arrivalDateAtPort'
    )
    expect(dateEntry.widget).toBe('date')
  })

  it('filters out obligations that are out of scope', () => {
    // Purpose is out of scope until reasonForImport is internal-market
    const filledState = evaluateState({
      [reasonForImport.id]: 'transit-through-eu'
    })
    const page = findPage('purpose-details')
    const desc = buildFieldDescriptors(page, filledState)
    expect(desc).toHaveLength(0)
  })

  it('shows only the in-scope transporter when transporter-type is filled', () => {
    const commercialState = evaluateState({
      [transporterType.id]: 'commercial'
    })
    const page = findPage('transporter-details')
    const desc = buildFieldDescriptors(page, commercialState)
    expect(desc.map((d) => d.obligation.name)).toContain(
      'commercialTransporter'
    )
    expect(desc.map((d) => d.obligation.name)).not.toContain(
      'privateTransporter'
    )
  })

  it('picks checkboxes for transited-countries when in scope', async () => {
    const { meansOfTransport } = await import('../obligations/obligations.js')
    const railwayState = evaluateState({
      [meansOfTransport.id]: 'railway'
    })
    const page = findPage('transited-countries')
    const desc = buildFieldDescriptors(page, railwayState)
    expect(desc).toHaveLength(1)
    expect(desc[0].obligation.name).toBe('transitedCountries')
    expect(desc[0].widget).toBe('checkboxes')
  })

  it('injects existing value on re-render', () => {
    const filled = evaluateState({
      [countryOfOrigin.id]: 'FR'
    })
    const page = findPage('country-of-origin')
    const desc = buildFieldDescriptors(page, filled)
    // For select widget, the selected option has selected: true
    const selectedItem = desc[0].view.args.items.find((i) => i.selected)
    expect(selectedItem.value).toBe('FR')
  })

  it('injects error text into the widget when errors passed in', () => {
    const page = findPage('reason-for-import')
    const desc = buildFieldDescriptors(page, state, {
      reasonForImport: { text: 'Choose a reason' }
    })
    expect(desc[0].view.args.errorMessage.text).toBe('Choose a reason')
  })
})
