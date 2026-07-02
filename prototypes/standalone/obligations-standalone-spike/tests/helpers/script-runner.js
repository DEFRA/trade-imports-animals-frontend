import { evaluateObligations, loadJourneyModel } from '../../engine/index.js'
import {
  containerApplies,
  expandSlots,
  firstPagePresentingObligation,
  journeyState
} from '../../flow-eval/index.js'
import {
  addIndexedFulfilment,
  applyPageAnswers,
  encodeFieldName
} from '../../orchestrator/index.js'
import { createJourneyRepository } from '../../store/index.js'

/**
 * Cross-Flow equivalence infrastructure (TEST-4/17/18/24/30, ARCH-3):
 * replays an obligation-level script against ONE Flow through the REAL
 * orchestrator. Each step names obligations, never pages — the runner
 * locates the given Flow's OWN presenting page, checks it is actually
 * reachable (appliesWhen gating all the way up), builds the page's form
 * payload and commits through write -> fixed point -> save. A journey
 * that cannot NAVIGATE to an answer throws NavigationError — kept loudly
 * distinct from an end-state diff so an equivalence failure is never
 * misread as a navigation bug or vice versa (TEST-29).
 */

/** Thrown when a Flow cannot reach the page a script step needs. */
export class NavigationError extends Error {}

const { obligations, identifiers } = loadJourneyModel()

/** Ids of every page reachable under the current evaluation's gating. */
const applicablePageIds = (flow, evaluation) => {
  const ids = new Set()
  const walk = (container) => {
    if (!containerApplies(container, evaluation)) {
      return
    }
    if (container.kind === 'page') {
      ids.add(container.id)
      return
    }
    for (const child of container.sections ?? container.children ?? []) {
      walk(child)
    }
  }
  walk(flow)
  return ids
}

const locatePage = (flow, evaluation, name, stepIndex) => {
  const page = firstPagePresentingObligation(flow, identifiers.idOf(name))
  if (!page) {
    throw new NavigationError(
      `[${flow.id}] step ${stepIndex}: no page presents "${name}"`
    )
  }
  if (!applicablePageIds(flow, evaluation).has(page.id)) {
    throw new NavigationError(
      `[${flow.id}] step ${stepIndex}: page "${page.id}" (for "${name}") is gated out`
    )
  }
  return page
}

/** The form payload one page POST carries for the step's answers. */
const payloadFor = (page, evaluation, answers) => {
  const payload = {}
  for (const slot of expandSlots(page, evaluation)) {
    if (!Object.hasOwn(answers, slot.name)) {
      continue
    }
    const record = identifiers.recordOfName(slot.name)
    const inputName = encodeFieldName(slot.name, slot.fulfilmentId)
    if (record.type === 'date') {
      for (const [part, raw] of Object.entries(answers[slot.name])) {
        payload[`${inputName}-${part}`] = raw
      }
    } else {
      payload[inputName] = answers[slot.name]
    }
  }
  return payload
}

const presentsName = (page, name) =>
  [...(page.presents ?? []), ...(page.presentsForEach ?? [])].some(
    (entry) => entry.obligation === identifiers.idOf(name)
  )

/**
 * Canonical end-state projection (TEST-30 provisional settlement):
 * name-keyed values with minted fulfilment ids stripped — user-source
 * indexed collections become value lists in insertion order, derived
 * indexed collections stay keyed by their stable controlling values.
 */
export function canonicalise(fulfilments) {
  const values = {}
  for (const record of obligations) {
    const entry = fulfilments[record.id]
    if (entry === undefined) {
      continue
    }
    if (record.cardinality === 'single') {
      values[record.name] = entry.value
    } else if (record.indexedBy.source === 'derived') {
      values[record.name] = Object.fromEntries(
        Object.entries(entry).map(([id, fulfilment]) => [id, fulfilment.value])
      )
    } else {
      values[record.name] = Object.values(entry).map(
        (fulfilment) => fulfilment.value
      )
    }
  }
  return values
}

/**
 * replayScript(flow, script) -> `{ journey, evaluation, canonical }`.
 * `canonical` is `{ values, journeyState }` — the deep-equal surface the
 * equivalence tier compares across Flows.
 */
export function replayScript(flow, script) {
  const repository = createJourneyRepository()
  let journey = repository.create(flow.id)

  script.steps.forEach((step, index) => {
    if (step.answers) {
      let names = Object.keys(step.answers)
      while (names.length > 0) {
        const evaluation = evaluateObligations(obligations, journey.fulfilments)
        const page = locatePage(flow, evaluation, names[0], index)
        const pageNames = names.filter((name) => presentsName(page, name))
        const answers = Object.fromEntries(
          pageNames.map((name) => [name, step.answers[name]])
        )
        journey = applyPageAnswers(
          journey,
          page,
          payloadFor(page, evaluation, answers),
          { repository, obligations }
        ).journey
        names = names.filter((name) => !pageNames.includes(name))
      }
      return
    }
    if (step.add) {
      const evaluation = evaluateObligations(obligations, journey.fulfilments)
      locatePage(flow, evaluation, step.add.names[0], index)
      journey = addIndexedFulfilment(journey, step.add.names, step.add.values, {
        repository,
        obligations
      }).journey
      return
    }
    throw new Error(`Unknown step shape at index ${index}`)
  })

  const evaluation = evaluateObligations(obligations, journey.fulfilments)
  return {
    journey,
    evaluation,
    canonical: {
      values: canonicalise(journey.fulfilments),
      journeyState: journeyState(flow, evaluation)
    }
  }
}
