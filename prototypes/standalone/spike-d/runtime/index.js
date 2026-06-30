import { steps, stepTitle, stepKind, fieldsFor } from './step-meta.js'
import { applicableSteps } from './applicability.js'
import { status, allComplete, missingRequired } from './status.js'
import { next, prev } from './navigation.js'
import { collect, applyAnswer } from './mutation.js'
import { viewItems } from './view-items.js'
import { validateStep } from './page-validation.js'
import { assembleQuote } from './assembly.js'
import { getSelectedAddons } from '../lib/addons/index.js'

/**
 * Option D runtime adapter. The JSON Schema owns validity; the annotations own
 * flow (steps/order/groups/types). Completeness is **partial validation** of the
 * answers; applicability comes from the active if/then; provenance is
 * **reconstructed** from the schema keyword that fired (the paradigm's weak
 * spot, vs Option C's authored reasons). A thin sequencer over annotations adds
 * the ordering JSON Schema has no concept of.
 *
 * This index assembles the public `contract` surface from the concern modules.
 */
export const contract = {
  steps,
  firstStep: steps[0],
  stepTitle,
  stepKind,
  fieldsFor,
  viewItems,
  applicableSteps,
  status,
  allComplete,
  next,
  prev,
  missingRequired,
  collect,
  applyAnswer,
  validate: validateStep,
  assembleQuote,
  getSelectedAddons
}
