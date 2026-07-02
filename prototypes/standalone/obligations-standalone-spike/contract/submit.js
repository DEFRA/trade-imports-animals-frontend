import { unfulfilledMandatory } from '../engine/index.js'
import { resolveReason } from '../i18n/index.js'
import { journeyRepository } from '../store/index.js'
import { changeTarget } from './navigation.js'
import { evaluate } from './status.js'

/**
 * [submit] — the CYA POST hard gate. The server re-checks the
 * engine-mandatory set from a fresh evaluation and never trusts the
 * button (Rulings item 2: open CYA access, hard gate HERE only). The
 * gate is STRICTER than the hub's Fulfilled: a reviewed-but-empty
 * mandatory collection (claimsDone with 0 claims, parity ruling c) is
 * hub-complete yet still blocks here with 'Add at least one claim'. On
 * pass the journey takes the one-way in-progress -> submitted flip with
 * `submittedAt` stamped by the repository, which blocks all further
 * writes (Rulings item 1).
 *
 * Graft 3 — the stale-recheck branch is first-class: state invalidated
 * between the CYA render and the POST returns a DISTINGUISHABLE result
 * carrying `missing[]` (with resolved copy, provenance and change hrefs)
 * plus a ready-made GDS `errorSummary`, so the route re-renders CYA
 * calling the gaps out — never an error page.
 */

/**
 * Every in-scope, engine-mandatory, unfulfilled obligation as a
 * renderable prompt: `{ obligationId, name, text, because, href }`.
 * `text` is the authored mandate copy, `because` the resolved
 * scope-provenance lines, `href` the Change target. Shared by the CYA
 * soft prompts (contract/view.js) and the stale-recheck result below.
 */
export function missingPrompts(evaluation) {
  return unfulfilledMandatory(evaluation).map(
    ({ obligationId, name, reasons }) => {
      const mandate = reasons.find((entry) => entry.code.startsWith('mandate.'))
      if (!mandate) {
        throw new Error(
          `Mandatory obligation "${name}" carries no authored mandate reason`
        )
      }
      return {
        obligationId,
        name,
        text: resolveReason(mandate),
        because: reasons
          .filter((entry) => entry.code === 'scope.answered')
          .map(resolveReason),
        href: changeTarget(name)
      }
    }
  )
}

const staleResult = (evaluation) => {
  const missing = missingPrompts(evaluation)
  return {
    ok: false,
    submitted: evaluation.submitted,
    missing,
    errorSummary: missing.map(({ text, href }) => ({ text, href })),
    evaluation
  }
}

/**
 * submit(journey) -> `{ ok: true, journey, reference, evaluation }` on
 * the flip, or the stale-recheck result `{ ok: false, submitted,
 * missing, errorSummary, evaluation }`. A re-POST against an already
 * submitted journey is `ok: false, submitted: true` with nothing
 * missing — the freeze answer, distinguishable from a stale one.
 */
export function submit(journey, options = {}) {
  const { repository = journeyRepository } = options
  const evaluation = evaluate(journey, options)
  if (evaluation.submitted || unfulfilledMandatory(evaluation).length > 0) {
    return staleResult(evaluation)
  }
  const saved = repository.submit(journey.journeyId)
  return {
    ok: true,
    journey: saved,
    reference: evaluation.reference,
    evaluation: evaluate(saved, options)
  }
}
