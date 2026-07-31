import { witnessFulfilments } from './witness-fulfilments.js'

// Fidelity check — the witness must actually open the closure. Any
// mismatch is a build-time defect (metadata drift vs. the real predicate).
export const confirmWitnessOpensGate = (obligation, witness) => {
  const { fulfilments, fulfilmentIds } = witnessFulfilments(obligation, witness)
  const decision = obligation.applyTo(fulfilments, fulfilmentIds)
  if (decision && decision.inScope === true) return { opened: true }
  return {
    opened: false,
    error: {
      obligationId: obligation.id,
      reason: `synthesised witness { ${witness.obligationId}: ${JSON.stringify(witness.value)} } did not open the gate (got ${JSON.stringify(decision)})`
    }
  }
}
