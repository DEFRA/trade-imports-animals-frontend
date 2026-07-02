import { firstApplicablePage } from './first-applicable-page.js'
import { firstUnfulfilledPage } from './first-unfulfilled-page.js'

/**
 * Section-entry mode resolution (obligations.md:1320-1350): a Task List
 * click resolves through the per-Section `entryMode` override, then the
 * Flow-level `sectionEntryMode`, then the safe default
 * `firstApplicablePage` (read-only intro Pages are not skipped on
 * first-time entry). In `firstUnfulfilledPage` mode a fully-Fulfilled
 * Section has nothing to find and gracefully degrades to the default
 * first-Page behaviour. Unknown modes throw loudly.
 */

export const SECTION_ENTRY_MODES = Object.freeze([
  'firstApplicablePage',
  'firstUnfulfilledPage'
])

export function sectionEntry(flow, section, evaluation, options = {}) {
  const mode =
    section.entryMode ?? flow.sectionEntryMode ?? 'firstApplicablePage'
  if (!SECTION_ENTRY_MODES.includes(mode)) {
    throw new Error(`Unknown section entry mode "${mode}"`)
  }
  if (mode === 'firstUnfulfilledPage') {
    return (
      firstUnfulfilledPage(section, evaluation, options) ??
      firstApplicablePage(section, evaluation, options)
    )
  }
  return firstApplicablePage(section, evaluation, options)
}
