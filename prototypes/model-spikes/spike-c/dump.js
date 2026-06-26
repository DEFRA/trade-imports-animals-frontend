import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contract } from './runtime/contract.js'
import { SHAPES } from '../shared/nav.js'

/**
 * Headless proof for Option C. The requirement graph's `missingRequired` (with
 * authored reasons) is this spike's signature, so it is printed prominently.
 *   node prototypes/model-spikes/spike-c/dump.js <fixture>
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))

function loadFixture(arg) {
  if (!arg) {
    return {}
  }
  const candidate = fs.existsSync(arg)
    ? arg
    : path.join(dirname, 'fixtures', `${arg}.json`)
  return JSON.parse(fs.readFileSync(candidate, 'utf8'))
}

function shapeView(answers, shape) {
  const live = contract.applicableSteps(answers)
  return {
    applicableSteps: live,
    status: Object.fromEntries(
      live.map((stepId) => [stepId, contract.status(answers, stepId, shape)])
    ),
    navigation: Object.fromEntries(
      live.map((stepId) => [
        stepId,
        {
          next: contract.next(answers, stepId, shape),
          prev: contract.prev(answers, stepId, shape)
        }
      ])
    )
  }
}

const answers = loadFixture(process.argv[2])

const out = {
  fixture: process.argv[2] ?? '(empty)',
  missingRequired: contract.missingRequired(answers),
  shape: shapeView(answers, SHAPES.grouped),
  allComplete: contract.allComplete(answers),
  assembleQuote: contract.assembleQuote(answers)
}

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`)
