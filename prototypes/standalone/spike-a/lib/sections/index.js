import { sections } from './definitions.js'

/**
 * Query helpers over the declarative section catalogue, plus the catalogue
 * itself re-exported so call sites keep one `./sections` entry point.
 */

export { sections }

export const sectionBySlug = new Map(sections.map((s) => [s.slug, s]))

/** Sections that own their own routes (loops, subtask fan-outs). */
export function hasOwnRoutes(section) {
  return Boolean(section.loop || section.subtasks)
}

/** Whether a section applies for the current answers (no predicate = always). */
export function applies(section, quote) {
  return !section.appliesWhen || section.appliesWhen(quote)
}

/** The sections that currently apply, in order — the live journey. */
export function applicableSections(quote) {
  return sections.filter((section) => applies(section, quote))
}

export function allSectionsComplete(quote) {
  return applicableSections(quote).every((section) => section.isComplete(quote))
}

/** Flatten every applicable section's rows for the check-your-answers list. */
export function answerRows(quote) {
  return applicableSections(quote).flatMap((section) =>
    section.rows(quote).map((row) => ({ ...row, slug: section.slug }))
  )
}
