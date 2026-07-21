import { describe, it, expect } from 'vitest'
import { obligations } from '../../model/obligations/obligations.js'
import * as commodities from './index.js'

// The commodity rule allowlists exist twice: this service exports them in
// picker-name vocabulary ('Cow') for the controllers that show/hide fields,
// and the manifest carries them in CN codes ('0102') for the evaluator's
// gates. Nothing structural ties the two together — an entry added on one
// side only silently desynchronises which commodities trigger which rule.
// These tests pin the correspondence in both directions, restricted to the
// codes the current commodity list can express (the manifest deliberately
// lists more CN codes than the stub picker carries; unexpressible codes are
// covered by the manifest-side whitelists.test.js pins).

// Gated-obligation name → the service accessor claiming the same rule.
// packageCountCommodities mixes picker names with inert 'CODE - Label'
// entries — only the picker-name entries can ever match a stored
// commoditySelection, so the pairing reads just those (see the
// characterisation pins below).
const SERVICE_ALLOWLISTS = {
  numberOfPackages: () =>
    pickerNameEntries(commodities.packageCountCommodities()),
  countyParishHoldingCph: commodities.cphCommodities,
  containsUnweanedAnimals: commodities.unweanedCommodities,
  animalIdentifierPassport: commodities.passportCommodities,
  animalIdentifierTattoo: commodities.tattooCommodities,
  animalIdentifierEarTag: commodities.earTagCommodities,
  horseName: commodities.horseNameCommodities,
  permanentAddress: commodities.permanentAddressCommodities
}

// notInUnionOf gates carry the derived UNION of the specific-identifier
// allowlists — complements of the pairs above, not service-mirrored rules.
const COMPLEMENT_GATES = new Set([
  'animalIdentifierIdentificationDetails',
  'animalIdentifierDescription'
])

const byUuid = new Map(
  obligations.map((obligation) => [obligation.id, obligation])
)

// Every manifest gate that allowlists on the stored commodity selection,
// derived from the applyTo metadata sidecar so new gates land here
// automatically.
const commodityGates = () =>
  obligations.flatMap((obligation) => {
    const meta = obligation.applyTo?.metadata
    if (!meta) return []
    if (meta.type !== 'allowListed' && meta.type !== 'anyAllowListed') {
      return []
    }
    if (byUuid.get(meta.obligation)?.name !== 'commoditySelection') return []
    return [{ gated: obligation.name, codes: meta.values }]
  })

const pickerNames = () => new Set(commodities.list())

const pickerNameEntries = (entries) =>
  entries.filter((entry) => pickerNames().has(entry))

const expressibleCodes = () =>
  new Set(commodities.list().map((name) => commodities.commodityCodeFor(name)))

/**
 * The drift between a service name-list and a manifest code-list:
 *   - untranslatable — service entries commodityCodeFor cannot map (they
 *     could never match a gate, so the rule silently loses them)
 *   - extra          — service entries mapping to a code OUTSIDE the
 *     manifest allowlist (UI shows the field, the model never scopes it)
 *   - missing        — manifest codes the picker CAN express that the
 *     service list omits (the model scopes the field, the UI hides it)
 */
const driftFor = (serviceNames, manifestCodes) => {
  const untranslatable = serviceNames.filter(
    (name) => commodities.commodityCodeFor(name) === undefined
  )
  const translated = new Set(
    serviceNames
      .map((name) => commodities.commodityCodeFor(name))
      .filter((code) => code !== undefined)
  )
  const reachable = manifestCodes.filter((code) => expressibleCodes().has(code))
  return {
    untranslatable,
    extra: [...translated].filter((code) => !manifestCodes.includes(code)),
    missing: reachable.filter((code) => !translated.has(code))
  }
}

const NO_DRIFT = { untranslatable: [], extra: [], missing: [] }

describe('allowlist drift — service name-lists vs manifest code-lists', () => {
  it('Should pair every commodity-allowlist gate with a service accessor', () => {
    const unpaired = commodityGates()
      .map((gate) => gate.gated)
      .filter((name) => !(name in SERVICE_ALLOWLISTS))
      .filter((name) => !COMPLEMENT_GATES.has(name))
    expect(unpaired).toEqual([])
  })

  for (const [gated, serviceList] of Object.entries(SERVICE_ALLOWLISTS)) {
    it(`Should keep the ${gated} allowlists in sync`, () => {
      const gate = commodityGates().find((entry) => entry.gated === gated)
      expect(gate).toBeDefined()
      expect(driftFor(serviceList(), gate.codes)).toEqual(NO_DRIFT)
    })
  }

  it('Should have teeth — an out-of-rule service entry is reported as extra', () => {
    const cph = commodityGates().find(
      (entry) => entry.gated === 'countyParishHoldingCph'
    )
    expect(driftFor(['Cow', 'Fish'], cph.codes).extra).toEqual(['0301'])
  })

  it('Should have teeth — an unknown service entry is reported as untranslatable', () => {
    const cph = commodityGates().find(
      (entry) => entry.gated === 'countyParishHoldingCph'
    )
    expect(driftFor(['Unicorn'], cph.codes).untranslatable).toEqual(['Unicorn'])
  })

  it('Should have teeth — an expressible manifest code the service omits is reported as missing', () => {
    const cph = commodityGates().find(
      (entry) => entry.gated === 'countyParishHoldingCph'
    )
    expect(driftFor([], cph.codes).missing).toEqual(['0102'])
  })
})

describe('#packageCountCommodities — mixed-format characterisation', () => {
  // The list mirrors the real frontend's reference data verbatim: four
  // picker names plus 'CODE - Label' display strings. Only the names can
  // match a stored commoditySelection; the rest are INERT under the
  // current picker. Pinned so an entry silently becoming live (or a new
  // picker commodity arriving without a matching entry) fails loudly.
  it('Should expose exactly the current picker names as live entries', () => {
    expect(
      pickerNameEntries(commodities.packageCountCommodities()).sort()
    ).toEqual(['Cat', 'Cow', 'Dog', 'Horse'])
  })

  it('Should keep every non-name entry inert — no stored selection can match it', () => {
    const inert = commodities
      .packageCountCommodities()
      .filter((entry) => !pickerNames().has(entry))
    for (const entry of inert) {
      expect(commodities.commodityCodeFor(entry)).toBeUndefined()
    }
  })
})
