import { containerApplies } from '../../flow-eval/index.js'
import { isFrozen } from '../guards.js'
import { journeyFlow, journeyModel } from '../status.js'
import { missingPrompts } from '../submit.js'
import { BESPOKE_ROWS, presentsRows } from './page-rows.js'

/**
 * The CYA assembly behind contract/view.js: applicable pages in Flow
 * order, the shared row shape with its 'Change <key>' accessible names
 * (dropped once Submitted — Rulings item 1), and the soft "you still
 * need to..." prompts a mid-journey CYA renders (Rulings item 2).
 */

/** Pages in Flow order with every appliesWhen gate honoured. */
const applicablePages = (flow, evaluation) => {
  const collect = (container) => {
    if (!containerApplies(container, evaluation)) {
      return []
    }
    return container.kind === 'page'
      ? [container]
      : (container.children ?? []).flatMap(collect)
  }
  return flow.sections.flatMap(collect)
}

const rowBuilder = (cya, frozen) => (key, value, href) => {
  const items = [
    { href, text: cya.changeActionText, visuallyHiddenText: key.toLowerCase() }
  ]
  return {
    key: { text: key },
    value: { text: value },
    ...(frozen ? {} : { actions: { items } })
  }
}

/**
 * cyaRows(evaluation) -> `{ rows, prompts }`: govuk summary list rows in
 * Flow order plus the soft "you still need to..." prompts a mid-journey
 * CYA renders (Rulings item 2), shared with the submit stale-recheck.
 */
export function cyaRows(evaluation) {
  const flow = journeyFlow()
  const { identifiers } = journeyModel()
  const cya = flow.checkYourAnswers
  const ctx = {
    flow,
    identifiers,
    cya,
    evaluation,
    valueOf: (name) => evaluation.fulfilments[identifiers.idOf(name)]?.value,
    row: rowBuilder(cya, isFrozen(evaluation))
  }
  const rows = applicablePages(flow, evaluation).flatMap((page) =>
    (BESPOKE_ROWS[page.id] ?? presentsRows)(page, ctx)
  )
  return { rows, prompts: missingPrompts(evaluation) }
}
