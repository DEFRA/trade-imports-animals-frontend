import { typeCompanions } from '../engine/index.js'
import { expandSlots, isReadOnly } from '../flow-eval/index.js'
import { resolveReason } from '../i18n/index.js'
import { hubPath } from '../journey/paths.js'
import { slotViews } from '../lib/fields/index.js'
import { encodeFieldName } from '../orchestrator/index.js'
import { journeyFlow, journeyModel, pageById } from './status.js'

/**
 * [view] — evaluation in, renderable view-models out. The hub view-model
 * is the journey shell's (graft 10, per-section visibility) re-exported
 * unchanged; `pageViewModel` projects any Flow Page into ordered govuk
 * widget view-items with pinned copy, prefill and GDS error wiring; the
 * CYA composition lives in contract/cya-rows.js.
 */

export { hubViewModel } from '../journey/hub-view.js'
export { cyaRows } from './cya-rows/index.js'

/** Record kind that is system-handled and never rendered as an input. */
const SYSTEM_KIND = 'system'

/** Dotted reason records -> English copy; unknown codes throw (graft 7). */
export const resolveReasons = (reasons = []) => reasons.map(resolveReason)

/** One lib/fields slot per concrete input: record type + Flow entry copy. */
const fieldSlot = (slot, identifiers) => {
  const record = identifiers.recordOfId(slot.obligationId)
  const { label, hint, options, suggestions, placeholder, revealedBy } =
    slot.entry
  return {
    inputName: encodeFieldName(slot.name, slot.fulfilmentId),
    type: record.type,
    constraints: record.constraints,
    label,
    hint,
    options,
    suggestions,
    placeholder,
    value: slot.value,
    ...(revealedBy && {
      revealedBy: {
        inputName: encodeFieldName(
          identifiers.nameOf(revealedBy.obligation),
          slot.fulfilmentId
        ),
        value: revealedBy.value
      }
    })
  }
}

/** System-handled slots (the quote) are never rendered as inputs. */
const userFacing = (slot, identifiers) =>
  typeCompanions[identifiers.recordOfId(slot.obligationId).type].kind !==
  SYSTEM_KIND

/**
 * pageViewModel(pageId, evaluation, errors?) -> the generic page
 * template context. `errors` is checkSave's `fieldErrors` map; passing
 * it wires `errorMessage` and the error classes onto the failing
 * widgets. Pages presenting nothing come out read-only with no fields
 * (intrinsic read-only, ARCH-29).
 */
export const pageViewModel = (pageId, evaluation, errors = null) => {
  const flow = journeyFlow()
  const page = pageById(pageId)
  const { identifiers } = journeyModel()
  const slots = expandSlots(page, evaluation)
    .filter((slot) => userFacing(slot, identifiers))
    .map((slot) => fieldSlot(slot, identifiers))
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    heading: page.heading,
    template: page.template,
    buttonText: page.buttonText ?? flow.defaults.saveButtonText,
    errorSummaryTitle: flow.defaults.errorSummaryTitle,
    readOnly: isReadOnly(page),
    backLink: hubPath(),
    fields: slotViews(slots, errors)
  }
}
