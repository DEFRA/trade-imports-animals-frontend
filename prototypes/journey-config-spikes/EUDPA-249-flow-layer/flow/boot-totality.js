/**
 * boot-totality.js — Phase 4 commit 2 of the EUDPA-288 blend plan.
 *
 * Port of A's boot-time page-coverage assert (`prototypes/standalone/
 * live-animals/flow/dispatch.js:55-63`, cached at `/tmp/A-dispatch.js`)
 * over B's `presents` / `presentsForEach` tree.
 *
 * ---------------------------------------------------------------------------
 * Why (BRIEF §Migration #4, REPORT §5.2)
 * ---------------------------------------------------------------------------
 *
 * Silent invisibility: an obligation authored in `obligations.js` but
 * not referenced by any page's `presents` / `presentsForEach` never
 * gets a chance to fulfil. Today the failure is silent — the
 * obligation just sits there, the CYA prints nothing for it, and the
 * only symptom is a value that never appears anywhere. This assert
 * closes the seam: at boot, enumerate every obligation and every
 * page's presented obligations; diff; throw with a named diagnostic
 * if any obligation is uncovered.
 *
 * Fires ONCE at flow-module-load time (see the bottom of `flow.js`)
 * so a fresh clone with a manifest defect halts the very first
 * `import` — no need for a separate boot-check test that could be
 * skipped.
 *
 * ---------------------------------------------------------------------------
 * Exclusion policy (adapted from A)
 * ---------------------------------------------------------------------------
 *
 * A excludes `obligation.system === true` (A-specific flag on system-
 * populated fields). B's manifest doesn't ship a `system` flag on the
 * obligations themselves — the equivalent policy here is expressed as
 * data on this module:
 *
 *   1. Structural group containers (`commodityLine`, `unitRecord`) —
 *      any obligation that another obligation references via
 *      `within`. They carry no value directly (their descendants do)
 *      and are correctly absent from any page. Detected via the
 *      `groups` set exported from `obligations.js` (already used by
 *      `coverage.test.js` for the same reason).
 *
 *   2. System-populated fields (`poApprovedReferenceNumber`,
 *      `responsiblePersonForLoad`) — declared for V4 completeness but
 *      NOT presented in the flow layer; value legality is enforced
 *      upstream (the system minting the id / gov.identity). This
 *      matches A's `obligation.system` exclusion. Listed by name in
 *      `SYSTEM_POPULATED` below; if / when B grows a `system: true`
 *      schema flag on those declarations this list collapses into
 *      `obligation.system === true`.
 *
 * Any other uncovered obligation is a genuine authoring defect and
 * halts boot with a message listing the offending name(s).
 */

/**
 * SYSTEM_POPULATED — obligations declared in the manifest for V4
 * completeness but intentionally NOT presented on any page. Mirrors
 * A's `obligation.system` flag for the two V4 fields whose value is
 * minted / consumed upstream (see obligations.js header + inline
 * comments on each declaration).
 */
export const SYSTEM_POPULATED = new Set([
  'poApprovedReferenceNumber',
  'responsiblePersonForLoad'
])

/**
 * collectPresentedObligationIds — walk a flow tree and return the set
 * of obligation ids referenced by any page's `presents` /
 * `presentsForEach`. Pure function; safe to call at any point.
 *
 * @param {object} flow — the flow tree ({ sections: [...] }).
 * @returns {Set<string>}
 */
export function collectPresentedObligationIds(flow) {
  const out = new Set()
  const visit = (node) => {
    for (const entry of node.presents ?? []) {
      if (entry?.obligation?.id) out.add(entry.obligation.id)
    }
    if (node.presentsForEach?.obligation?.id) {
      out.add(node.presentsForEach.obligation.id)
    }
    for (const child of node.children ?? node.sections ?? []) visit(child)
  }
  visit(flow)
  return out
}

/**
 * assertObligationTotality — throw if any obligation in the manifest
 * is not referenced by any page's `presents` / `presentsForEach`,
 * after excluding structural group containers and system-populated
 * fields (see the header for the exclusion policy).
 *
 * Message shape mirrors A's `Obligations collected by no page: <ids>`
 * so cross-branch traces stay legible when diagnosing a live boot
 * failure.
 *
 * @param {Array<object>} obligations — the manifest array from
 *   `obligations/obligations.js`.
 * @param {object} flow — the flow tree from `flow/flow.js`.
 * @throws {Error} if any non-excluded obligation is uncovered.
 */
export function assertObligationTotality(obligations, flow) {
  const presented = collectPresentedObligationIds(flow)

  // Structural group containers — any obligation referenced by another
  // obligation's `within`. Matches the `groups` computation at the
  // bottom of `obligations.js`; re-derived here so this module doesn't
  // depend on that named export (keeps the check callable with any
  // manifest, including test fixtures).
  const structuralGroupIds = new Set(
    obligations
      .filter((o) => obligations.some((other) => other.within === o))
      .map((o) => o.id)
  )

  const uncovered = obligations
    .filter((o) => !presented.has(o.id))
    .filter((o) => !structuralGroupIds.has(o.id))
    .filter((o) => !SYSTEM_POPULATED.has(o.name))
    .map((o) => o.name)

  if (uncovered.length > 0) {
    throw new Error(`Obligations collected by no page: ${uncovered.join(', ')}`)
  }
}
