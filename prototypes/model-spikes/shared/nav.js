/**
 * Shared, model-agnostic navigation glue for the journey-model spikes.
 *
 * Every spike implements the same `contract` (see README.md). These helpers turn
 * the contract's render-agnostic `next` / `prev` results — a step id or a
 * `{ terminal }` marker — into concrete prototype URLs, and own the three
 * journey-shape descriptors so all four spikes are driven identically. The only
 * thing that differs between spikes is the contract (model + pure functions);
 * the wiring below is deliberately shared so the comparison is apples-to-apples.
 */

/** The three journey shapes from the acceptance bar, shared by every spike. */
export const SHAPES = {
  linear: { kind: 'linear' },
  hub: { kind: 'hub' },
  grouped: {
    kind: 'grouped',
    groups: [
      {
        title: 'About you and your vehicle',
        stepIds: ['about-you', 'your-vehicle']
      },
      {
        title: 'Your driving and cover',
        stepIds: ['driving-history', 'claims', 'cover-type', 'optional-extras']
      }
    ]
  }
}

/** Loops and subtask fan-outs own their own routes; everything else is generic. */
export function pathForStep(contract, base, quote, stepId) {
  const kind = contract.stepKind(stepId)
  if (kind === 'loop') {
    return `${base}/${quote.id}/claims`
  }
  if (kind === 'subtasks') {
    return `${base}/${quote.id}/addons`
  }
  return `${base}/${quote.id}/${stepId}`
}

const hubPath = (base, quote) => `${base}/${quote.id}`
const summaryPath = (base, quote) => `${base}/${quote.id}/quote-summary`

/**
 * Resolve a contract `next` / `prev` result (step id or `{ terminal }`) to a URL.
 */
export function resolveNav(contract, base, quote, result) {
  if (typeof result === 'string') {
    return pathForStep(contract, base, quote, result)
  }
  switch (result.terminal) {
    case 'summary':
      return summaryPath(base, quote)
    case 'hub':
      return hubPath(base, quote)
    case 'start':
    default:
      return base
  }
}
