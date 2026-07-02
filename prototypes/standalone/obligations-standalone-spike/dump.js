import fs from 'node:fs'
import {
  canSubmit,
  cyaRows,
  evaluate,
  journeyState,
  modelJson
} from './contract/index.js'

/**
 * Graft 12 — headless "surface the model without its UI" proof,
 * diffable against spike-a/dump.js:
 *
 *   node prototypes/standalone/obligations-standalone-spike/dump.js [fixture]
 *
 * [fixture] is a path to a JSON file of obligation values keyed by NAME
 * (indexed obligations pre-shaped as `{ fulfilmentId: { value } }`);
 * omitted = an empty journey. Prints the obligations analogue of
 * spike-a's { shape, missingRequired, allComplete }: container statuses
 * and journey state stand in for shape, the CYA soft prompts for
 * missingRequired, canSubmit for allComplete. No server, no rendering.
 */

const records = JSON.parse(modelJson().obligations).obligations
const byName = new Map(records.map((record) => [record.name, record]))

function fulfilmentsFrom(values) {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => {
      const record = byName.get(name)
      if (!record) {
        throw new Error(`Unknown obligation name "${name}"`)
      }
      return [record.id, record.cardinality === 'indexed' ? value : { value }]
    })
  )
}

const fixture = process.argv[2]
const values = fixture ? JSON.parse(fs.readFileSync(fixture, 'utf8')) : {}

// A synthetic Journey envelope — all `evaluate` needs; the fixed id
// keeps the derived reference deterministic so dumps diff cleanly.
const journey = {
  journeyId: '00000000-0000-4000-8000-000000000000',
  status: 'in-progress',
  submittedAt: null,
  fulfilments: fulfilmentsFrom(values)
}

const evaluation = evaluate(journey)

const out = {
  fixture: fixture ?? '(empty)',
  journeyState: journeyState(evaluation),
  canSubmit: canSubmit(evaluation),
  reference: evaluation.reference,
  containerStatuses: evaluation.containerStatuses,
  stillNeeded: cyaRows(evaluation).prompts,
  drops: evaluation.drops
}

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`)
