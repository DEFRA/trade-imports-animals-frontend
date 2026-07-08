import { describe, expect, it } from 'vitest'
import { reconcile } from './engine/evaluate/reconcile.js'
import { entryComplete, satisfied } from './engine/evaluate/complete.js'

describe('item-scoped conditionality — sibling-identity resolution', () => {
  it('Should apply the item-relative gate by sibling identity, not id-keying (resolver unity)', () => {
    const topLevel = { id: 'topLevel' }
    const gated = {
      id: 'gated',
      required: true,
      activatedBy: { obligation: topLevel, equals: 'yes' }
    }
    const obligation = { id: 'x', item: [gated] }
    expect(entryComplete(obligation, {})).toBe(false)
    expect(entryComplete(obligation, { gated: 'answered' })).toBe(true)
  })
})

describe('item-scoped conditionality with a LIST target (commodity → packages)', () => {
  const line = (commoditySelection) => ({
    commoditySelection,
    typeSelection: 'domestic',
    speciesSelection: ['bos-taurus'],
    numberOfAnimalsQuantity: '25'
  })

  it('Should scope numberOfPackages per instance when the commodity is one of the list', () => {
    const { inScope } = reconcile({
      commodityLines: [line('0102 - Cattle'), line('0301 - Fish')]
    })
    expect(inScope.has('commodityLines[0].numberOfPackages')).toBe(true)
    expect(inScope.has('commodityLines[1].numberOfPackages')).toBe(false)
  })

  it('Should wipe a stale package count when the commodity leaves the list', () => {
    const { wiped } = reconcile({
      commodityLines: [
        { ...line('0102 - Cattle'), numberOfPackages: '5' },
        { ...line('0301 - Fish'), numberOfPackages: '9' }
      ]
    })
    expect(wiped).toContain('commodityLines[1].numberOfPackages')
    expect(wiped).not.toContain('commodityLines[0].numberOfPackages')
  })

  it('Should not owe the optional package count for completeness either way', () => {
    const withUnit = (commoditySelection) => ({
      commodityLines: [
        {
          ...line(commoditySelection),
          animalIdentifiers: [
            { animalIdentifierIdentificationDetails: 'Hive mark HM-1' }
          ]
        }
      ]
    })
    expect(satisfied('commodityLines', withUnit('0102 - Cattle'))).toBe(true)
    expect(satisfied('commodityLines', withUnit('0301 - Fish'))).toBe(true)
  })
})
