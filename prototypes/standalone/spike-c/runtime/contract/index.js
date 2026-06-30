import { steps, stepById } from '../model.js'
import { applicableSteps, missingRequired } from '../engine.js'
import { getSelectedAddons } from '../../lib/addons/index.js'
import { fieldsFor, viewItems } from './view.js'
import { status, allComplete } from './status.js'
import { next, prev } from './navigation.js'
import { collect, applyAnswer } from './mutation.js'
import { assembleQuote, validateStep } from './assembly.js'

/**
 * Option C runtime adapter — the common contract as thin reads over the
 * requirement-graph snapshot (`engine.evaluate`). Navigation is a thin
 * consequence of step order + applicability; the value is that required-ness and
 * `because` come from the rules layer with **authored** reasons.
 *
 * This module re-assembles the public `contract` object from the concern
 * modules (view / status / navigation / mutation / assembly) plus the tiny
 * model reads below.
 */

const stepOrder = steps.map((step) => step.id)
const stepKind = (id) => stepById.get(id)?.kind
const stepTitle = (id) => stepById.get(id)?.title

export const contract = {
  steps: stepOrder,
  firstStep: stepOrder[0],
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
