import { slotToView } from './registry.js'
import { attachError } from './errors.js'

export { slotToView } from './registry.js'
export { attachError } from './errors.js'

/**
 * slotViews(slots, errors?) — ordered slot -> FieldViewItem mapping, one
 * logical input per presents/presentsForEach slot (TOOL-12/14).
 *
 * FieldViewItem (the interface templates/partials/fields.njk renders):
 *   { type: 'input'|'textarea'|'charactercount'|'date'|'radios'|
 *           'checkboxes'|'select'|'file',
 *     args: <govuk macro arguments>, suggestions?: [text] }
 * A radios item may carry `reveal: FieldViewItem` — the govuk conditional
 * composition (excessAmount under the voluntaryExcess 'Yes' radio). Slots
 * declaring `revealedBy: { inputName, value }` are folded into their
 * revealing control's matching item rather than emitted top-level; an
 * unknown host or option value throws loudly.
 */
export function slotViews(slots, errors = null) {
  const views = []
  const byInputName = new Map()
  const buildView = (slot) => {
    const view = slotToView(slot)
    if (errors) {
      attachError(view, slot, errors)
    }
    return view
  }
  for (const slot of slots.filter((candidate) => !candidate.revealedBy)) {
    const view = buildView(slot)
    views.push(view)
    byInputName.set(slot.inputName, view)
  }
  for (const slot of slots.filter((candidate) => candidate.revealedBy)) {
    const host = byInputName.get(slot.revealedBy.inputName)
    if (!host?.args?.items) {
      throw new Error(
        `No revealing control "${slot.revealedBy.inputName}" for "${slot.inputName}"`
      )
    }
    const item = host.args.items.find(
      (candidate) => candidate.value === slot.revealedBy.value
    )
    if (!item) {
      throw new Error(
        `No "${slot.revealedBy.value}" option on "${slot.revealedBy.inputName}" to reveal "${slot.inputName}"`
      )
    }
    item.reveal = buildView(slot)
  }
  return views
}
