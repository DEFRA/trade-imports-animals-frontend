import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contract } from './runtime/contract/index.js'
import { grouped } from './journey/index.js'

/**
 * Headless "surface the model without its UI" proof.
 *
 *   node prototypes/standalone/spike-c/dump.js <fixture>
 *
 * <fixture> is a name under ./fixtures (e.g. `with-claims`) or a path to a JSON
 * answers file. Prints the journey state — applicable steps, per-step status,
 * next/prev and missingRequired-with-reasons — for the grouped shape, plus the
 * assembled domain quote. No server, no rendering.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))

function loadFixture(fixtureArg) {
  if (!fixtureArg) {
    return {}
  }
  const candidate = fs.existsSync(fixtureArg)
    ? fixtureArg
    : path.join(dirname, 'fixtures', `${fixtureArg}.json`)
  return JSON.parse(fs.readFileSync(candidate, 'utf8'))
}

const statusByStep = (answers, applicableSteps, shape) =>
  Object.fromEntries(
    applicableSteps.map((stepId) => [
      stepId,
      contract.status(answers, stepId, shape)
    ])
  )

const navigationByStep = (answers, applicableSteps, shape) =>
  Object.fromEntries(
    applicableSteps.map((stepId) => [
      stepId,
      {
        next: contract.next(answers, stepId, shape),
        prev: contract.prev(answers, stepId, shape)
      }
    ])
  )

function shapeView(answers, shape) {
  const applicableSteps = contract.applicableSteps(answers)
  return {
    applicableSteps,
    status: statusByStep(answers, applicableSteps, shape),
    navigation: navigationByStep(answers, applicableSteps, shape)
  }
}

const answers = loadFixture(process.argv[2])

const report = {
  fixture: process.argv[2] ?? '(empty)',
  shape: shapeView(answers, grouped),
  missingRequired: contract.missingRequired(answers),
  allComplete: contract.allComplete(answers),
  assembleQuote: contract.assembleQuote(answers)
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
