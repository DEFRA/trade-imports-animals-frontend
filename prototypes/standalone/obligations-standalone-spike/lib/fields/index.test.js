import { describe, it, expect } from 'vitest'
import { slotViews } from './index.js'

const voluntaryExcess = {
  inputName: 'voluntaryExcess',
  label: 'Do you want to add a voluntary excess?',
  type: 'boolean',
  value: 'yes'
}

const excessAmount = {
  inputName: 'excessAmount',
  label: 'Voluntary excess amount',
  type: 'currency',
  revealedBy: { inputName: 'voluntaryExcess', value: 'yes' }
}

describe('lib/fields/index — ordered slotViews over a page', () => {
  it('maps slots to views in declared order, one view per slot', () => {
    const views = slotViews([
      { inputName: 'fullName', label: 'Full name', type: 'text' },
      { inputName: 'country', label: 'Country of residence', type: 'select' }
    ])
    expect(views.map((view) => view.type)).toEqual(['input', 'select'])
    expect(views[0].args.name).toBe('fullName')
  })

  it('folds a revealed slot under its controlling Yes item', () => {
    const views = slotViews([voluntaryExcess, excessAmount])
    expect(views).toHaveLength(1)
    const [radios] = views
    const yes = radios.args.items.find((item) => item.value === 'yes')
    const no = radios.args.items.find((item) => item.value === 'no')
    expect(yes.reveal.args.name).toBe('excessAmount')
    expect(yes.reveal.args.prefix).toEqual({ text: '£' })
    expect(no.reveal).toBeUndefined()
  })

  it('attaches errors to top-level and revealed views alike', () => {
    const views = slotViews([voluntaryExcess, excessAmount], {
      excessAmount: 'Excess amount must be an amount'
    })
    const yes = views[0].args.items.find((item) => item.value === 'yes')
    expect(yes.reveal.args.errorMessage).toEqual({
      text: 'Excess amount must be an amount'
    })
  })

  it('throws loudly when the revealing control is missing', () => {
    expect(() => slotViews([excessAmount])).toThrow(
      'No revealing control "voluntaryExcess" for "excessAmount"'
    )
  })

  it('throws loudly when the revealing option value does not exist', () => {
    const wrongValue = {
      ...excessAmount,
      revealedBy: { inputName: 'voluntaryExcess', value: 'maybe' }
    }
    expect(() => slotViews([voluntaryExcess, wrongValue])).toThrow(
      'No "maybe" option on "voluntaryExcess" to reveal "excessAmount"'
    )
  })
})
