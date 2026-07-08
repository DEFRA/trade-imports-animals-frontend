import { describe, expect, it } from 'vitest'
import { reconcile } from './engine/evaluate/reconcile.js'
import { entryComplete } from './engine/evaluate/complete.js'
import { commodityLines } from './features/commodities/obligations.js'

/**
 * The car windscreen claim was the live carrier for the EQUALS-gated,
 * REQUIRED item-conditional field (`windscreenProvider` owed only when the
 * sibling `claimType === 'windscreen'`) and for the depth-2 item-conditional.
 * It was removed with the named-driver feature. The surviving live carrier is
 * `commodityLines[i].numberOfPackages` — INCLUDES-gated and OPTIONAL — so an
 * equals-gated / required-sibling / depth-2 item-conditional has no live
 * instance until M2. The engine capability stays; see docs/limits.md.
 */
describe('item-scoped conditionality — sibling-identity resolution', () => {
  it('Should apply the item-relative gate by sibling identity, not id-keying (resolver unity)', () => {
    // The gate fires only for true siblings — the SAME criterion reconcile
    // uses, so entryComplete and reconcile cannot diverge; a non-sibling ref
    // is owed conservatively, not skipped.
    const topLevel = { id: 'topLevel' }
    const gated = {
      id: 'gated',
      required: true,
      activatedBy: { obligation: topLevel, equals: 'yes' } // ref is NOT a sibling
    }
    const obligation = { id: 'x', item: [gated] }
    expect(entryComplete(obligation, {})).toBe(false) // owed (conservative), not skipped
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
        { ...line('0301 - Fish'), numberOfPackages: '9' } // stale
      ]
    })
    expect(wiped).toContain('commodityLines[1].numberOfPackages')
    expect(wiped).not.toContain('commodityLines[0].numberOfPackages')
  })

  it('Should not owe the optional package count for completeness either way', () => {
    expect(entryComplete(commodityLines, line('0102 - Cattle'))).toBe(true)
    expect(entryComplete(commodityLines, line('0301 - Fish'))).toBe(true)
  })
})
