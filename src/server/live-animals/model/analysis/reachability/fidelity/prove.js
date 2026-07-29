import { dependencyRecordFor } from './dependency-record.js'
import { proveReachability } from '../graph/prove.js'
import { synthesiseWitness } from '../witness/synthesise.js'
import { confirmWitnessOpensGate } from './confirm.js'
import { WITNESS_KIND } from '../witness/kinds.js'

/**
 * proveWithWitnesses — tightened prover. Runs the graph-level check
 * first (must succeed), then confirms every gate whose helper carries
 * recoverable metadata can actually be opened by feeding the
 * synthesised witness into the real `applyTo` closure and asserting
 * `inScope: true`. Trivially-open gates (total branchedGate,
 * structural groups) pass without a closure run. Opaque gates fall
 * back to graph-only (recorded on the result so callers can see how
 * much of the manifest gets the tightened check).
 *
 * @param {Array<object>} obligations — the manifest entries themselves
 *   (not the `{id, dependsOn}` records fed to `proveReachability`).
 *   Each must carry an `id` at minimum; gated entries carry
 *   `applyTo.metadata` + `dependsOn`.
 * @returns {{
 *   reachable: string[],
 *   unreachable: string[],
 *   errors: Array<{obligationId: string, reason: string}>,
 *   witnesses: {
 *     synthesisable: string[],  // gates value-level proved
 *     trivial: string[],        // gates trivially open (no witness needed)
 *     opaque: string[]          // gates left at graph-level only
 *   }
 * }}
 */
export const proveWithWitnesses = (obligations) => {
  const records = obligations.map(dependencyRecordFor)
  const graph = proveReachability(records)

  const synthesisable = []
  const trivial = []
  const opaque = []
  const errors = [...graph.errors]

  for (const obligation of obligations) {
    const witness = synthesiseWitness(obligation)
    switch (witness.kind) {
      case WITNESS_KIND.TRIVIAL:
        trivial.push(obligation.id)
        break
      case WITNESS_KIND.OPAQUE:
        opaque.push(obligation.id)
        break
      case WITNESS_KIND.WITNESS: {
        const result = confirmWitnessOpensGate(obligation, witness)
        if (result.opened) {
          synthesisable.push(obligation.id)
        } else {
          errors.push(result.error)
        }
        break
      }
      /* c8 ignore next 2 */
      default:
        errors.push({
          obligationId: obligation.id,
          reason: `synthesiseWitness returned unknown kind '${witness.kind}'`
        })
    }
  }

  return {
    reachable: graph.reachable,
    unreachable: graph.unreachable,
    errors,
    witnesses: {
      synthesisable,
      trivial,
      opaque
    }
  }
}
