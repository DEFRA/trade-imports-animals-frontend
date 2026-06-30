import { stepOrder } from '../model.js'
import { getSelectedAddons } from '../../lib/addons/index.js'
import { validateStep } from '../../validation/compile/index.js'
import {
  assembleQuote,
  missingRequiredErrors
} from '../../validation/assemble/index.js'
import { applicableStepIds, status, allComplete } from './status.js'
import { next, prev } from './navigation.js'
import { collect, applyAnswer } from './mutation.js'
import { stepKind, stepTitle, fieldsFor, viewItems } from './view.js'

/**
 * Option A runtime adapter — the **common contract**, assembled from pure
 * selector functions over the declarative model. Status/navigation/
 * applicability/completeness are all *derived* from the model data.
 */

function missingRequired(answers) {
  return missingRequiredErrors(answers).map(({ stepId, fieldId, because }) => ({
    stepId,
    fieldId,
    because
  }))
}

export const contract = {
  steps: stepOrder,
  firstStep: stepOrder[0],
  stepTitle,
  stepKind,
  fieldsFor,
  viewItems,
  applicableSteps: applicableStepIds,
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
