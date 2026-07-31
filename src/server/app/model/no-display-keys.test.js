import { describe, it, expect } from 'vitest'

import { obligations } from './obligations/obligations.js'
import {
  DISPLAY_KEYS,
  findDisplayKeyOffenders,
  assertNoDisplayKeys
} from './no-display-keys.js'

/**
 * Key-level purity gate for the model.
 *
 * No display logic in the model. `obligation-
 * purity.js` polices imports; this polices keys. Object-scoped — it inspects
 * the live obligation objects, never source text, so `analysis/`'s
 * `OPERATOR_LABELS` / helper-type "labels" AST-operator constants are out of
 * scope and cannot false-positive.
 */
describe('model has no display keys', () => {
  it('bans the display keys', () => {
    expect(DISPLAY_KEYS).toEqual([
      'label',
      'title',
      'titleKey',
      'hint',
      'legend',
      'widget'
    ])
  })

  it('finds NO display key on the real model', () => {
    expect(findDisplayKeyOffenders(obligations)).toEqual([])
  })

  it('does not throw on the real model', () => {
    expect(() => assertNoDisplayKeys(obligations)).not.toThrow()
  })

  // Positive control — the negative-control discipline. A labelled fixture
  // MUST be caught; if the walk were a no-op this bite test
  // would fail, so a green suite proves the check actually inspects keys.
  describe('positive control — a labelled fixture is caught', () => {
    it('catches a top-level display key on an obligation-shaped object', () => {
      const labelled = {
        id: 'ctrl-1',
        name: 'controlObligation',
        label: 'Reason for import'
      }
      const offenders = findDisplayKeyOffenders([labelled])
      expect(offenders).toContain('obligations[controlObligation].label')
    })

    it('catches a display key nested inside metadata / subFields / item[]', () => {
      const labelled = {
        id: 'ctrl-2',
        name: 'nestedControl',
        metadata: { shape: 'staticEnum', widget: 'radios' },
        item: [{ name: 'child', titleKey: 'domain.child.title' }],
        subFieldRules: { country: { type: 'enum', hint: 'Pick one' } }
      }
      const offenders = findDisplayKeyOffenders([labelled])
      expect(offenders).toEqual(
        expect.arrayContaining([
          'obligations[nestedControl].metadata.widget',
          'obligations[nestedControl].item[0].titleKey',
          'obligations[nestedControl].subFieldRules.country.hint'
        ])
      )
    })

    it('catches a display key on a nested obligation entry', () => {
      const labelled = {
        id: 'ctrl-3',
        name: 'nestedEntryControl',
        value: { type: 'enum', options: () => [], title: 'Country of origin' }
      }
      const offenders = findDisplayKeyOffenders([labelled])
      expect(offenders).toContain('obligations[nestedEntryControl].value.title')
    })

    it('assertNoDisplayKeys throws, naming the offending path', () => {
      const labelled = {
        id: 'ctrl-4',
        name: 'throwControl',
        legend: 'Transporter'
      }
      expect(() => assertNoDisplayKeys([labelled])).toThrow(
        /obligations\[throwControl\]\.legend/
      )
    })
  })

  // The walk must not choke on the model's real shapes: the `applyTo`
  // function sidecar (a display key hidden in a gate decision must bite) and
  // the `within` self-references that make the object graph cyclic.
  it('inspects display keys hidden on an applyTo.metadata gate decision', () => {
    const fn = () => ({ inScope: true })
    fn.metadata = {
      type: 'equalsGate',
      whenTrue: { inScope: true, label: 'x' }
    }
    const gated = { id: 'ctrl-5', name: 'gatedControl', applyTo: fn }
    const offenders = findDisplayKeyOffenders([gated])
    expect(offenders).toContain(
      'obligations[gatedControl].applyTo.metadata.whenTrue.label'
    )
  })

  it('terminates on a cyclic obligation graph', () => {
    const nodeA = { id: 'a', name: 'a' }
    const nodeB = { id: 'b', name: 'b', within: nodeA }
    nodeA.within = nodeB
    expect(() => findDisplayKeyOffenders([nodeA, nodeB])).not.toThrow()
    expect(findDisplayKeyOffenders([nodeA, nodeB])).toEqual([])
  })
})
