import { makeScope } from '../engine/index.js'
import { sections } from '../flow/flow.js'
import { pageGatePasses, sectionGatePasses } from '../flow/gates.js'

/**
 * MODEL-LEVEL journey simulator (DISCUSSION-LOG entry 4) — persona in, the
 * exact ordered page sequence out, with no browser and no server. This is the
 * payoff of modelling obligations at all: walk a persona's journey purely in
 * code and read properties off it, instead of clicking through or writing a UI
 * test.
 *
 * A persona is just an `answers` map (the same shape the store holds). The
 * simulator derives scope via the real `makeScope` (so it can never drift from
 * runtime), then threads the flow section-by-section, emitting each page whose
 * section gate AND page gate pass (authored or derived — `flow/gates.js`).
 * That reproduces "linear run through a section, back to the hub, on to the
 * next section" as a flat ordered list.
 *
 * Pure: it reuses the engine + flow the app uses; it re-implements nothing.
 */

/** Persona (answers) -> ordered list of page ids the persona would visit. */
export function simulateJourney(answers = {}) {
  const scope = makeScope(answers)
  const pages = []
  for (const section of sections) {
    if (!sectionGatePasses(section, scope)) continue
    for (const page of section.pages) {
      if (pageGatePasses(page, scope)) pages.push(page.id)
    }
  }
  return pages
}
