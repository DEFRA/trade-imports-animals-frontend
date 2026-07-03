/**
 * Slot expansion over a Page's `presents` / `presentsForEach` entries
 * (obligations.md:966-1045). Every function takes ObligationEvaluator
 * output as an argument — nothing here recomputes scope, mandate or
 * fulfilled-ness; per-slot flags are copied verbatim from the evaluation.
 *
 * `presentsForEach` is an ARRAY of entries (provisional schema pick,
 * OPEN2-1 — the doc sketches a single object) so one page can project
 * several indexed obligations sharing fulfilment ids. Slots come out in
 * entry-major order (declared entry order, then the evaluation's
 * per-fulfilment order); views regroup by `fulfilmentId` where a page
 * projects sibling indexed obligations (the claims list).
 */

/** Default page-mandate when an entry does not declare one. */
const DEFAULT_MANDATE = 'soft'

/** Read-only-ness is intrinsic — no presents, no presentsForEach. */
export const isReadOnly = (page) =>
  (page.presents?.length ?? 0) === 0 &&
  (page.presentsForEach?.length ?? 0) === 0

const declaredEntries = (page) => [
  ...(page.presents ?? []),
  ...(page.presentsForEach ?? [])
]

const obligationEntry = (page, evaluation, entry) => {
  const obligation = evaluation.obligations[entry.obligation]
  if (!obligation) {
    throw new Error(
      `Page "${page.id}" presents unknown obligation "${entry.obligation}"`
    )
  }
  return obligation
}

/**
 * Obligation-level view of a Page: one row per declared entry, pairing
 * the Flow entry (presentation copy, page mandate) with the evaluated
 * obligation. The container-status leaf rule reads this — an indexed
 * obligation's collection-level fulfilled-ness lives here, not on slots.
 */
export const presentedObligations = (page, evaluation) =>
  declaredEntries(page).map((entry) => ({
    entry,
    obligation: obligationEntry(page, evaluation, entry)
  }))

const slotOf = (entry, obligation, fulfilment, value) => ({
  obligationId: entry.obligation,
  name: obligation.name,
  fulfilmentId: fulfilment?.fulfilmentId ?? null,
  pageMandate: entry.mandate ?? DEFAULT_MANDATE,
  inScope: obligation.inScope,
  engineStatus: obligation.status,
  fulfilled: fulfilment ? fulfilment.fulfilled : obligation.fulfilled,
  value,
  entry
})

/**
 * Expand a Page into ordered concrete input slots: one slot per
 * `presents` entry, one per in-scope fulfilment of each `presentsForEach`
 * entry (zero fulfilments expand to zero slots — the dynamically-empty
 * case, obligations.md:1042-1045).
 */
export const expandSlots = (page, evaluation) => [
  ...(page.presents ?? []).map((entry) => {
    const obligation = obligationEntry(page, evaluation, entry)
    const value = evaluation.fulfilments[entry.obligation]?.value
    return slotOf(entry, obligation, null, value)
  }),
  ...(page.presentsForEach ?? []).flatMap((entry) => {
    const obligation = obligationEntry(page, evaluation, entry)
    return (obligation.fulfilments ?? []).map((fulfilment) => {
      const value =
        evaluation.fulfilments[entry.obligation]?.[fulfilment.fulfilmentId]
          ?.value
      return slotOf(entry, obligation, fulfilment, value)
    })
  })
]
