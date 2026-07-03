import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Bounded state-space generator for the completability tier (TEST-3/13/14)
 * — no PBT framework, per the no-new-dependencies rail. The controlling
 * dimensions come from parity-facts: hadClaims (drives the claims loop),
 * voluntaryExcess (drives the excessAmount mandate), addons (drives the
 * three derived add-on fan-outs) and whether a claim row exists. The full
 * cross product is 3 x 2 x 3 x 9 = 162 states, comfortably under the
 * <500 bound. States where a claim exists without hadClaims yes are
 * enumerated too, flagged incoherent — the fixed-point wipe must
 * reconcile them, and the closure test proves it.
 */

const modelPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'model',
  'obligations.json'
)
const { obligations } = JSON.parse(fs.readFileSync(modelPath, 'utf8'))
const idOf = (name) => {
  const record = obligations.find((candidate) => candidate.name === name)
  if (!record) {
    throw new Error(`Unknown obligation name "${name}"`)
  }
  return record.id
}

const ANSWERED_OR_NOT = (values) => [undefined, ...values]
const ADDON_VALUES = ['named-driver', 'modifications', 'protected-ncd']

/** Every subset of the addon values, [] included. */
const addonSubsets = ADDON_VALUES.reduce(
  (subsets, addon) => [
    ...subsets,
    ...subsets.map((subset) => [...subset, addon])
  ],
  [[]]
)

/** The enumerated states: `{ label, coherent, fulfilments }`. */
export const enumerateStates = () =>
  ANSWERED_OR_NOT(['yes', 'no']).flatMap((hadClaims) =>
    [0, 1].flatMap((claimCount) =>
      ANSWERED_OR_NOT(['yes', 'no']).flatMap((voluntaryExcess) =>
        ANSWERED_OR_NOT(addonSubsets).map((addons) => ({
          label: `hadClaims=${hadClaims} claims=${claimCount} voluntaryExcess=${voluntaryExcess} addons=${addons?.join('+') ?? undefined}`,
          coherent: claimCount === 0 || hadClaims === 'yes',
          fulfilments: {
            ...(hadClaims !== undefined && {
              [idOf('hadClaims')]: { value: hadClaims }
            }),
            ...(claimCount > 0 && {
              [idOf('claimType')]: { 'claim-1': { value: 'accident' } },
              [idOf('claimAmount')]: { 'claim-1': { value: '900' } }
            }),
            ...(voluntaryExcess !== undefined && {
              [idOf('voluntaryExcess')]: { value: voluntaryExcess }
            }),
            ...(addons !== undefined && {
              [idOf('addons')]: { value: addons }
            })
          }
        }))
      )
    )
  )

/**
 * The canonical satisfying value per obligation TYPE — a non-blank
 * answer the completability filler writes into any engine-mandatory gap.
 */
export const satisfyingValueFor = (record) => {
  switch (record.type) {
    case 'email':
      return 'user@example.com'
    case 'tel':
      return '01234 567890'
    case 'formatted':
      return 'AB12 CDE'
    case 'number':
      return String(record.constraints?.min ?? 1)
    case 'currency':
      return '250'
    case 'date':
      return { day: '27', month: '3', year: '1985' }
    case 'boolean':
      return 'yes'
    case 'radio':
    case 'select':
      return record.options[0]
    case 'multi-select':
      return [record.options[0]]
    case 'textarea':
      return 'Example description'
    default:
      return 'Example answer'
  }
}
